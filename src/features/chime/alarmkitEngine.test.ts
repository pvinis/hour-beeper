import { describe, expect, it } from "vitest"

import { buildNotificationRequests } from "./notificationEngine"
import { DEFAULT_CHIME_SETTINGS, createCustomHoursSchedule } from "./schedule"
import { reconcileChimeSchedule } from "./scheduler"
import {
	buildAlarmKitArtifacts,
	reconcileAlarmKitSchedule,
	type AlarmKitClient,
	type AlarmKitScheduledRecord,
} from "./alarmkitEngine"

const allWeekdays = [1, 2, 3, 4, 5, 6, 7]

describe("buildAlarmKitArtifacts", () => {
	it("maps sparse custom hours to distinct repeating alarm artifacts", () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "alarmkit" as const,
			schedule: createCustomHoursSchedule([16, 11, 16]),
			sound: "digital" as const,
		}

		const artifacts = buildAlarmKitArtifacts(settings)

		expect(
			artifacts.map((artifact) => ({
				slotKey: artifact.slotKey,
				hour: artifact.hour,
				minute: artifact.minute,
				weekdays: artifact.weekdays,
				soundName: artifact.soundName,
			})),
		).toEqual([
			{
				slotKey: "11:00",
				hour: 11,
				minute: 0,
				weekdays: allWeekdays,
				soundName: "digital-beep.wav",
			},
			{
				slotKey: "16:00",
				hour: 16,
				minute: 0,
				weekdays: allWeekdays,
				soundName: "digital-beep.wav",
			},
		])
	})
})

describe("reconcileAlarmKitSchedule", () => {
	it("schedules artifacts on supported devices with authorization", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "alarmkit" as const,
			schedule: createCustomHoursSchedule([11, 16]),
		}
		const fakeClient = createFakeAlarmKitClient({
			available: true,
			authorizationStatus: "authorized",
		})

		const result = await reconcileAlarmKitSchedule(fakeClient, settings)

		expect(result.status).toBe("scheduled")
		expect(result.permission.status).toBe("granted")
		expect(fakeClient.scheduled.map((artifact) => artifact.slotKey)).toEqual(["11:00", "16:00"])
	})

	it("marks AlarmKit unavailable on unsupported devices", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "alarmkit" as const,
		}
		const fakeClient = createFakeAlarmKitClient({
			available: false,
			authorizationStatus: "unavailable",
		})

		const result = await reconcileAlarmKitSchedule(fakeClient, settings)

		expect(result.status).toBe("unavailable")
		expect(result.permission.status).toBe("unavailable")
		expect(fakeClient.scheduled).toEqual([])
	})

	it("surfaces denied authorization without scheduling alarms", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "alarmkit" as const,
		}
		const fakeClient = createFakeAlarmKitClient({
			available: true,
			authorizationStatus: "denied",
		})

		const result = await reconcileAlarmKitSchedule(fakeClient, settings)

		expect(result.status).toBe("blocked")
		expect(result.permission.status).toBe("denied")
		expect(fakeClient.scheduled).toEqual([])
	})

	it("does not duplicate matching artifacts on relaunch", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "alarmkit" as const,
			schedule: createCustomHoursSchedule([11, 16]),
		}
		const existing = toScheduledRecords(buildAlarmKitArtifacts(settings))
		const fakeClient = createFakeAlarmKitClient({
			available: true,
			authorizationStatus: "authorized",
			existing,
		})

		const result = await reconcileAlarmKitSchedule(fakeClient, settings)

		expect(result.status).toBe("unchanged")
		expect(fakeClient.cancelCount).toBe(0)
		expect(fakeClient.scheduled).toEqual([])
	})
})

describe("reconcileChimeSchedule", () => {
	it("switches from notification mode to AlarmKit without losing schedule intent", async () => {
		const settings = {
			...DEFAULT_CHIME_SETTINGS,
			enabled: true,
			deliveryMode: "alarmkit" as const,
			schedule: createCustomHoursSchedule([11, 16]),
			sound: "soft" as const,
		}
		const notificationExisting = buildNotificationRequests(
			{ ...settings, deliveryMode: "notification" },
			{ count: 2 },
		)
		const notificationClient = createFakeNotificationClient(notificationExisting.map((request) => ({
			identifier: request.identifier,
			content: request.content,
		})))
		const alarmkitClient = createFakeAlarmKitClient({
			available: true,
			authorizationStatus: "authorized",
		})

		const result = await reconcileChimeSchedule(settings, {
			notificationClient,
			alarmkitClient,
		})

		expect(result?.notification?.status).toBe("cleared")
		expect(result?.notification?.canceledIds).toHaveLength(2)
		expect(result?.alarmkit?.status).toBe("scheduled")
		expect(alarmkitClient.scheduled.map((artifact) => artifact.slotKey)).toEqual(["11:00", "16:00"])
	})
})

function toScheduledRecords(artifacts: ReturnType<typeof buildAlarmKitArtifacts>): AlarmKitScheduledRecord[] {
	return artifacts.map((artifact) => ({
		id: artifact.id,
		slotKey: artifact.slotKey,
		hour: artifact.hour,
		minute: artifact.minute,
		weekdays: artifact.weekdays,
		soundName: artifact.soundName,
	}))
}

function createFakeAlarmKitClient({
	available,
	authorizationStatus,
	existing = [],
}: {
	available: boolean
	authorizationStatus: Awaited<ReturnType<AlarmKitClient["getAuthorizationStatusAsync"]>>
	existing?: AlarmKitScheduledRecord[]
}) {
	const scheduled: ReturnType<typeof buildAlarmKitArtifacts> = []
	let cancelCount = 0

	const client: AlarmKitClient & {
		scheduled: ReturnType<typeof buildAlarmKitArtifacts>
		cancelCount: number
	} = {
		scheduled,
		cancelCount,
		async isAvailableAsync() {
			return available
		},
		async getAuthorizationStatusAsync() {
			return authorizationStatus
		},
		async requestAuthorizationAsync() {
			return authorizationStatus
		},
		async scheduleAlarmsAsync(artifacts) {
			scheduled.push(...artifacts)
			return artifacts.map((artifact) => artifact.id)
		},
		async cancelAllAsync() {
			cancelCount += 1
			client.cancelCount = cancelCount
		},
		async listScheduledAsync() {
			return existing
		},
	}

	return client
}

function createFakeNotificationClient(existing: { identifier: string; content: { sound?: string | boolean | null; data?: Record<string, unknown> } }[]) {
	const canceledIds: string[] = []
	const dismissedIds: string[] = []

	return {
		canceledIds,
		dismissedIds,
		async getPermissionsAsync() {
			return { granted: true, status: "granted", canAskAgain: true }
		},
		async requestPermissionsAsync() {
			return { granted: true, status: "granted", canAskAgain: true }
		},
		async getAllScheduledNotificationsAsync() {
			return existing
		},
		async getPresentedNotificationsAsync() {
			return []
		},
		async scheduleNotificationAsync() {
			throw new Error("notification scheduling should not occur in this scenario")
		},
		async cancelScheduledNotificationAsync(identifier: string) {
			canceledIds.push(identifier)
		},
		async dismissNotificationAsync(identifier: string) {
			dismissedIds.push(identifier)
		},
	}
}
