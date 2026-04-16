import { DateTime } from "luxon"
import { describe, expect, it } from "vitest"

import { DEFAULT_CHIME_SETTINGS, createCustomHoursSchedule } from "./schedule"
import {
	buildNotificationRequests,
	reconcileNotificationSchedule,
	type NotificationClient,
	type ScheduledNotificationRecord,
} from "./notificationEngine"

const from = DateTime.fromISO("2026-04-16T10:15:00", { zone: "UTC" })

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
			permissions: { granted: true, status: "granted", canAskAgain: true },
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
			permissions: { granted: true, status: "granted", canAskAgain: true },
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
			permissions: { granted: true, status: "granted", canAskAgain: true },
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
			permissions: { granted: true, status: "granted", canAskAgain: true },
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
}: {
	permissions: Awaited<ReturnType<NotificationClient["getPermissionsAsync"]>>
	existing?: ScheduledNotificationRecord[]
}) {
	const scheduled: ReturnType<typeof buildNotificationRequests> = []
	const canceledIds: string[] = []

	const client: NotificationClient & {
		scheduled: ReturnType<typeof buildNotificationRequests>
		canceledIds: string[]
	} = {
		scheduled,
		canceledIds,
		async getPermissionsAsync() {
			return permissions
		},
		async requestPermissionsAsync() {
			return permissions
		},
		async getAllScheduledNotificationsAsync() {
			return existing
		},
		async scheduleNotificationAsync(request) {
			scheduled.push(request)
			return request.identifier
		},
		async cancelScheduledNotificationAsync(identifier) {
			canceledIds.push(identifier)
		},
	}

	return client
}
