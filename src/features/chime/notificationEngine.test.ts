import { DateTime } from "luxon"
import { describe, expect, it, vi } from "vitest"

import { DEFAULT_CHIME_SETTINGS, createCustomHoursSchedule } from "./schedule"
import {
	buildNotificationRequests,
	configureNotificationRuntime,
	dismissPresentedHourBeeperNotifications,
	dismissPresentedNotificationIfOwned,
	reconcileNotificationSchedule,
	type NotificationClient,
	type ScheduledNotificationRecord,
} from "./notificationEngine"

const from = DateTime.fromISO("2026-04-16T10:15:00", { zone: "UTC" })
const grantedPermissions = { granted: true, status: "granted" as const, canAskAgain: true }

describe("buildNotificationRequests", () => {
	it("builds notification artifacts for the active schedule and sound", () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "notification" as const,
			sound: "soft" as const,
		}

		const requests = buildNotificationRequests(settings, { from, count: 3 })

		expect(
			requests.map((request) => ({
				id: request.identifier,
				when: request.occursAt.toISO(),
				sound: request.content.sound,
			})),
		).toEqual([
			{
				id: "hour-beeper.notification.2026-04-16T11:00:00.000Z",
				when: "2026-04-16T11:00:00.000Z",
				sound: "soft-beep.wav",
			},
			{
				id: "hour-beeper.notification.2026-04-16T12:00:00.000Z",
				when: "2026-04-16T12:00:00.000Z",
				sound: "soft-beep.wav",
			},
			{
				id: "hour-beeper.notification.2026-04-16T13:00:00.000Z",
				when: "2026-04-16T13:00:00.000Z",
				sound: "soft-beep.wav",
			},
		])
	})
})

describe("dismissPresentedNotificationIfOwned", () => {
	it("dismisses a delivered Hour Beeper notification by exact identifier", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "notification" as const,
		}
		const presented = toScheduledRecords(buildNotificationRequests(settings, { from, count: 1 }))
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			presented,
		})

		const didDismiss = await dismissPresentedNotificationIfOwned(fakeClient, presented[0]!)

		expect(didDismiss).toBe(true)
		expect(fakeClient.dismissedIds).toEqual([presented[0]!.identifier])
	})

	it("ignores delivered notifications that do not belong to Hour Beeper", async () => {
		const foreignNotification = {
			identifier: "other-app.notification.2026-04-16T11:00:00.000Z",
			content: {
				sound: "soft-beep.wav",
				data: { source: "other-app", sound: "soft" },
			},
		}
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			presented: [foreignNotification],
		})

		const didDismiss = await dismissPresentedNotificationIfOwned(fakeClient, foreignNotification)

		expect(didDismiss).toBe(false)
		expect(fakeClient.dismissedIds).toEqual([])
	})
})

describe("dismissPresentedHourBeeperNotifications", () => {
	it("dismisses all presented Hour Beeper notifications and leaves unrelated ones untouched", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "notification" as const,
		}
		const presented = toScheduledRecords(buildNotificationRequests(settings, { from, count: 2 }))
		const foreignNotification = {
			identifier: "other-app.notification.2026-04-16T13:00:00.000Z",
			content: {
				sound: "digital-beep.wav",
				data: { source: "other-app", sound: "digital" },
			},
		}
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			presented: [...presented, foreignNotification],
		})

		const dismissedIds = await dismissPresentedHourBeeperNotifications(fakeClient)

		expect(dismissedIds).toEqual(presented.map((record) => record.identifier))
		expect(fakeClient.dismissedIds).toEqual(presented.map((record) => record.identifier))
	})
})

describe("configureNotificationRuntime", () => {
	it("registers one receive listener and performs immediate and catch-up cleanup", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "notification" as const,
		}
		const presented = toScheduledRecords(buildNotificationRequests(settings, { from, count: 2 }))
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			presented: [presented[1]!],
		})

		const receiveListeners: Array<
			(notification: {
				request: { identifier: string; content: { sound?: string | boolean | null; data?: Record<string, unknown> } }
			}) => void
		> = []
		const activeListeners: Array<(state: string) => void> = []
		const notifications = {
			setNotificationHandler: vi.fn(),
			addNotificationReceivedListener: vi.fn((listener) => {
				receiveListeners.push(listener)
				return { remove: vi.fn() }
			}),
		}
		const appState = {
			addEventListener: vi.fn((event: string, listener: (state: string) => void) => {
				if (event === "change") {
					activeListeners.push(listener)
				}
				return { remove: vi.fn() }
			}),
		}

		const cleanup = await configureNotificationRuntime(fakeClient, {
			notifications,
			appState,
		})
		await Promise.resolve()

		expect(notifications.setNotificationHandler).toHaveBeenCalledTimes(1)
		expect(notifications.addNotificationReceivedListener).toHaveBeenCalledTimes(1)
		expect(appState.addEventListener).toHaveBeenCalledTimes(1)
		expect(fakeClient.dismissedIds).toEqual([presented[1]!.identifier])

		receiveListeners[0]!({
			request: {
				identifier: presented[0]!.identifier,
				content: presented[0]!.content,
			},
		})
		await Promise.resolve()

		expect(fakeClient.dismissedIds).toEqual([
			presented[1]!.identifier,
			presented[0]!.identifier,
		])

		activeListeners[0]!("active")
		await Promise.resolve()

		await configureNotificationRuntime(fakeClient, {
			notifications,
			appState,
		})
		await Promise.resolve()

		expect(notifications.addNotificationReceivedListener).toHaveBeenCalledTimes(1)
		expect(appState.addEventListener).toHaveBeenCalledTimes(1)

		cleanup()
	})
})

describe("reconcileNotificationSchedule", () => {
	it("replaces stale requests when the schedule or sound changes", async () => {
		const existingSettings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "notification" as const,
			sound: "classic" as const,
		}
		const nextSettings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "notification" as const,
			schedule: createCustomHoursSchedule([11, 16]),
			sound: "digital" as const,
		}
		const existing = toScheduledRecords(buildNotificationRequests(existingSettings, { from, count: 3 }))
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			existing,
		})

		const result = await reconcileNotificationSchedule(fakeClient, nextSettings, { from, count: 2 })

		expect(result.status).toBe("scheduled")
		expect(result.canceledIds).toEqual(existing.map((request) => request.identifier))
		expect(fakeClient.scheduled.map((request) => request.content.sound)).toEqual([
			"digital-beep.wav",
			"digital-beep.wav",
		])
		expect(fakeClient.scheduled.map((request) => request.occursAt.toISO())).toEqual([
			"2026-04-16T11:00:00.000Z",
			"2026-04-16T16:00:00.000Z",
		])
	})

	it("does not duplicate existing requests on rehydrate", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "notification" as const,
		}
		const existing = toScheduledRecords(buildNotificationRequests(settings, { from, count: 2 }))
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			existing,
		})

		const result = await reconcileNotificationSchedule(fakeClient, settings, { from, count: 2 })

		expect(result.status).toBe("unchanged")
		expect(result.canceledIds).toEqual([])
		expect(fakeClient.scheduled).toEqual([])
	})

	it("removes pending notification artifacts when chimes are disabled", async () => {
		const enabledSettings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "notification" as const,
		}
		const existing = toScheduledRecords(buildNotificationRequests(enabledSettings, { from, count: 2 }))
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			existing,
		})

		const result = await reconcileNotificationSchedule(
			fakeClient,
			{ ...enabledSettings, enabled: false },
			{ from, count: 2 },
		)

		expect(result.status).toBe("cleared")
		expect(result.canceledIds).toEqual(existing.map((request) => request.identifier))
		expect(fakeClient.scheduled).toEqual([])
	})

	it("surfaces denied permission without scheduling notifications", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "notification" as const,
		}
		const fakeClient = createFakeClient({
			permissions: { granted: false, status: "denied", canAskAgain: false },
		})

		const result = await reconcileNotificationSchedule(fakeClient, settings, { from, count: 2 })

		expect(result.status).toBe("blocked")
		expect(result.permission.status).toBe("denied")
		expect(fakeClient.scheduled).toEqual([])
	})

	it("tears down notification artifacts when switching away from notification mode", async () => {
		const notificationSettings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "notification" as const,
		}
		const existing = toScheduledRecords(buildNotificationRequests(notificationSettings, { from, count: 2 }))
		const fakeClient = createFakeClient({
			permissions: grantedPermissions,
			existing,
		})

		const result = await reconcileNotificationSchedule(
			fakeClient,
			{ ...notificationSettings, deliveryMode: "alarmkit" },
			{ from, count: 2 },
		)

		expect(result.status).toBe("cleared")
		expect(result.canceledIds).toEqual(existing.map((request) => request.identifier))
		expect(fakeClient.scheduled).toEqual([])
	})
})

function toScheduledRecords(requests: ReturnType<typeof buildNotificationRequests>): ScheduledNotificationRecord[] {
	return requests.map((request) => ({
		identifier: request.identifier,
		content: request.content,
	}))
}

function createFakeClient({
	permissions,
	existing = [],
	presented = [],
}: {
	permissions: Awaited<ReturnType<NotificationClient["getPermissionsAsync"]>>
	existing?: ScheduledNotificationRecord[]
	presented?: ScheduledNotificationRecord[]
}) {
	const scheduled: ReturnType<typeof buildNotificationRequests> = []
	const canceledIds: string[] = []
	const dismissedIds: string[] = []

	const client: NotificationClient & {
		scheduled: ReturnType<typeof buildNotificationRequests>
		canceledIds: string[]
		dismissedIds: string[]
	} = {
		scheduled,
		canceledIds,
		dismissedIds,
		async getPermissionsAsync() {
			return permissions
		},
		async requestPermissionsAsync() {
			return permissions
		},
		async getAllScheduledNotificationsAsync() {
			return existing
		},
		async getPresentedNotificationsAsync() {
			return presented
		},
		async scheduleNotificationAsync(request) {
			scheduled.push(request)
			return request.identifier
		},
		async cancelScheduledNotificationAsync(identifier) {
			canceledIds.push(identifier)
		},
		async dismissNotificationAsync(identifier) {
			dismissedIds.push(identifier)
		},
	}

	return client
}
