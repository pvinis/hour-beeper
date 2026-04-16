import { DateTime } from "luxon"

import {
	getNotificationPermissionState,
	requestNotificationPermissionState,
	type NotificationPermissionClient,
	type NotificationPermissionResponse,
	type NotificationPermissionState,
} from "./permissions"
import { materializeUpcomingOccurrences } from "./schedule"
import type { ChimeSettings, ChimeSound } from "./types"

const NOTIFICATION_ID_PREFIX = "hour-beeper.notification"
const NOTIFICATION_SOURCE = "hour-beeper"
const DEFAULT_NOTIFICATION_COUNT = 24

const SOUND_FILES: Record<ChimeSound, string> = {
	casio: "casio-beep.wav",
	classic: "classic-beep.wav",
	soft: "soft-beep.wav",
	digital: "digital-beep.wav",
}

export interface HourBeeperNotificationData extends Record<string, unknown> {
	source: typeof NOTIFICATION_SOURCE
	occurrenceId: string
	scheduledFor: string
	sound: ChimeSound
}

export interface HourBeeperNotificationContent {
	title: string
	body: string
	sound: string
	data: HourBeeperNotificationData
	interruptionLevel: "active"
}

export interface HourBeeperNotificationRequest {
	identifier: string
	occursAt: DateTime
	content: HourBeeperNotificationContent
}

export interface ScheduledNotificationRecord {
	identifier: string
	content: {
		sound?: string | boolean | null
		data?: Record<string, unknown>
	}
}

export interface NotificationClient extends NotificationPermissionClient {
	getAllScheduledNotificationsAsync(): Promise<ScheduledNotificationRecord[]>
	scheduleNotificationAsync(request: HourBeeperNotificationRequest): Promise<string>
	cancelScheduledNotificationAsync(identifier: string): Promise<void>
}

export interface NotificationReconciliationResult {
	status: "scheduled" | "unchanged" | "cleared" | "blocked"
	permission: NotificationPermissionState
	canceledIds: string[]
	scheduledIds: string[]
	requestCount: number
}

let didConfigureForegroundNotifications = false

export function buildNotificationRequests(
	settings: ChimeSettings,
	options: {
		from?: DateTime
		count?: number
	} = {},
): HourBeeperNotificationRequest[] {
	if (!settings.enabled || settings.deliveryMode !== "notification") {
		return []
	}

	return materializeUpcomingOccurrences(settings.schedule, {
		from: options.from,
		count: options.count ?? DEFAULT_NOTIFICATION_COUNT,
	}).map((occurrence) => {
		const identifier = createNotificationIdentifier(occurrence.occursAt)

		return {
			identifier,
			occursAt: occurrence.occursAt,
			content: {
				title: "Hour Beeper",
				body: `Chime for ${occurrence.occursAt.toFormat("HH:mm")}`,
				sound: SOUND_FILES[settings.sound],
				data: {
					source: NOTIFICATION_SOURCE,
					occurrenceId: identifier,
					scheduledFor: occurrence.occursAt.toISO() ?? identifier,
					sound: settings.sound,
				},
				interruptionLevel: "active",
			},
		}
	})
}

export async function reconcileNotificationSchedule(
	client: NotificationClient,
	settings: ChimeSettings,
	options: {
		from?: DateTime
		count?: number
		requestPermissionsIfNeeded?: boolean
	} = {},
): Promise<NotificationReconciliationResult> {
	const permission = options.requestPermissionsIfNeeded
		? await requestNotificationPermissionState(client)
		: await getNotificationPermissionState(client)
	const existing = (await client.getAllScheduledNotificationsAsync()).filter(isHourBeeperNotification)

	if (settings.deliveryMode !== "notification" || !settings.enabled) {
		const canceledIds = await cancelNotifications(client, existing)

		return {
			status: "cleared",
			permission,
			canceledIds,
			scheduledIds: [],
			requestCount: 0,
		}
	}

	if (!permission.isGranted) {
		const canceledIds = await cancelNotifications(client, existing)

		return {
			status: "blocked",
			permission,
			canceledIds,
			scheduledIds: [],
			requestCount: 0,
		}
	}

	const desired = buildNotificationRequests(settings, options)

	if (hasMatchingNotificationPlan(existing, desired)) {
		return {
			status: "unchanged",
			permission,
			canceledIds: [],
			scheduledIds: [],
			requestCount: desired.length,
		}
	}

	const canceledIds = await cancelNotifications(client, existing)
	const scheduledIds: string[] = []

	for (const request of desired) {
		scheduledIds.push(await client.scheduleNotificationAsync(request))
	}

	return {
		status: "scheduled",
		permission,
		canceledIds,
		scheduledIds,
		requestCount: desired.length,
	}
}

export async function configureForegroundNotifications() {
	if (didConfigureForegroundNotifications) {
		return
	}

	const Notifications = await import("expo-notifications")

	Notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldShowBanner: false,
			shouldShowList: false,
			shouldPlaySound: true,
			shouldSetBadge: false,
		}),
	})

	didConfigureForegroundNotifications = true
}

export async function createExpoNotificationClient(): Promise<NotificationClient> {
	const Notifications = await import("expo-notifications")

	return {
		getPermissionsAsync: () =>
			Notifications.getPermissionsAsync() as Promise<NotificationPermissionResponse>,
		requestPermissionsAsync: () =>
			Notifications.requestPermissionsAsync({
				ios: {
					allowAlert: true,
					allowBadge: false,
					allowSound: true,
				},
			}) as Promise<NotificationPermissionResponse>,
		getAllScheduledNotificationsAsync: async () => {
			const requests = await Notifications.getAllScheduledNotificationsAsync()

			return requests.map((request) => ({
				identifier: request.identifier,
				content: {
					sound: request.content.sound,
					data: request.content.data,
				},
			}))
		},
		scheduleNotificationAsync: (request) =>
			Notifications.scheduleNotificationAsync({
				identifier: request.identifier,
				content: request.content,
				trigger: {
					type: Notifications.SchedulableTriggerInputTypes.DATE,
					date: request.occursAt.toJSDate(),
				},
			}),
		cancelScheduledNotificationAsync: (identifier) =>
			Notifications.cancelScheduledNotificationAsync(identifier),
	}
}

function createNotificationIdentifier(occursAt: DateTime) {
	return `${NOTIFICATION_ID_PREFIX}.${occursAt.toUTC().toISO()}`
}

function hasMatchingNotificationPlan(
	existing: ScheduledNotificationRecord[],
	desired: HourBeeperNotificationRequest[],
) {
	if (existing.length !== desired.length) {
		return false
	}

	const existingFingerprints = new Set(existing.map(getRecordFingerprint).filter(Boolean))

	if (existingFingerprints.size !== desired.length) {
		return false
	}

	return desired.every((request) => existingFingerprints.has(getRequestFingerprint(request)))
}

async function cancelNotifications(
	client: NotificationClient,
	records: ScheduledNotificationRecord[],
) {
	const canceledIds: string[] = []

	for (const record of records) {
		await client.cancelScheduledNotificationAsync(record.identifier)
		canceledIds.push(record.identifier)
	}

	return canceledIds
}

function getRequestFingerprint(request: HourBeeperNotificationRequest) {
	return [request.identifier, request.content.sound, request.content.data.sound].join("|")
}

function getRecordFingerprint(record: ScheduledNotificationRecord) {
	const sound = typeof record.content.sound === "string" ? record.content.sound : ""
	const data = record.content.data
	const soundId = isRecord(data) && typeof data.sound === "string" ? data.sound : ""

	return [record.identifier, sound, soundId].join("|")
}

function isHourBeeperNotification(record: ScheduledNotificationRecord) {
	if (record.identifier.startsWith(NOTIFICATION_ID_PREFIX)) {
		return true
	}

	const data = record.content.data

	return isRecord(data) && data.source === NOTIFICATION_SOURCE
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}
