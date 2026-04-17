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

interface NotificationRecordContent {
	sound?: string | boolean | null
	data?: Record<string, unknown>
}

export interface NotificationRecord {
	identifier: string
	content: NotificationRecordContent
}

export type ScheduledNotificationRecord = NotificationRecord
export type PresentedNotificationRecord = NotificationRecord

export interface NotificationClient extends NotificationPermissionClient {
	getAllScheduledNotificationsAsync(): Promise<ScheduledNotificationRecord[]>
	getPresentedNotificationsAsync(): Promise<PresentedNotificationRecord[]>
	scheduleNotificationAsync(request: HourBeeperNotificationRequest): Promise<string>
	cancelScheduledNotificationAsync(identifier: string): Promise<void>
	dismissNotificationAsync(identifier: string): Promise<void>
}

export interface NotificationReconciliationResult {
	status: "scheduled" | "unchanged" | "cleared" | "blocked"
	permission: NotificationPermissionState
	canceledIds: string[]
	scheduledIds: string[]
	requestCount: number
}

interface NotificationBehavior {
	shouldShowBanner: boolean
	shouldShowList: boolean
	shouldPlaySound: boolean
	shouldSetBadge: boolean
}

interface NotificationHandlerModule {
	setNotificationHandler(handler: {
		handleNotification: () => Promise<NotificationBehavior>
	}): void
}

interface NotificationRuntimeEvent {
	request: {
		identifier: string
		content: NotificationRecordContent
	}
}

interface SubscriptionLike {
	remove(): void
}

interface NotificationRuntimeModule extends NotificationHandlerModule {
	addNotificationReceivedListener(listener: (notification: NotificationRuntimeEvent) => void): SubscriptionLike
}

interface AppStateAdapter {
	addEventListener(type: "change", listener: (state: string) => void): SubscriptionLike
}

export interface NotificationRuntimeDependencies {
	notifications?: NotificationRuntimeModule
	appState?: AppStateAdapter
}

let didConfigureForegroundNotifications = false
let didConfigureNotificationRuntime = false
let notificationRuntimeCleanup: (() => void) | null = null

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

export async function dismissPresentedNotificationIfOwned(
	client: NotificationClient,
	record: PresentedNotificationRecord,
) {
	if (!isHourBeeperNotification(record)) {
		return false
	}

	try {
		await client.dismissNotificationAsync(record.identifier)
		return true
	} catch (error) {
		console.warn("[notificationEngine] Failed to dismiss presented notification:", error)
		return false
	}
}

export async function dismissPresentedHourBeeperNotifications(client: NotificationClient) {
	try {
		const presented = await client.getPresentedNotificationsAsync()
		const dismissedIds: string[] = []

		for (const record of presented) {
			if (await dismissPresentedNotificationIfOwned(client, record)) {
				dismissedIds.push(record.identifier)
			}
		}

		return dismissedIds
	} catch (error) {
		console.warn("[notificationEngine] Failed to inspect presented notifications:", error)
		return []
	}
}

export async function configureForegroundNotifications(
	module?: NotificationHandlerModule,
) {
	if (didConfigureForegroundNotifications) {
		return
	}

	const notifications = module ?? (await loadNotificationRuntimeModule())

	notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldShowBanner: false,
			shouldShowList: false,
			shouldPlaySound: true,
			shouldSetBadge: false,
		}),
	})

	didConfigureForegroundNotifications = true
}

export async function configureNotificationRuntime(
	client: NotificationClient,
	dependencies: NotificationRuntimeDependencies = {},
) {
	if (didConfigureNotificationRuntime && notificationRuntimeCleanup) {
		return notificationRuntimeCleanup
	}

	const notifications = dependencies.notifications ?? (await loadNotificationRuntimeModule())
	const appState = dependencies.appState ?? (await loadAppStateAdapter())

	await configureForegroundNotifications(notifications)

	void dismissPresentedHourBeeperNotifications(client)

	const notificationSubscription = notifications.addNotificationReceivedListener((notification) => {
		void dismissPresentedNotificationIfOwned(client, {
			identifier: notification.request.identifier,
			content: notification.request.content,
		})
	})

	const appStateSubscription = appState.addEventListener("change", (state) => {
		if (state !== "active") {
			return
		}

		void dismissPresentedHourBeeperNotifications(client)
	})

	notificationRuntimeCleanup = () => {
		notificationSubscription.remove()
		appStateSubscription.remove()
		notificationRuntimeCleanup = null
		didConfigureNotificationRuntime = false
	}
	didConfigureNotificationRuntime = true

	return notificationRuntimeCleanup
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

			return requests.map((request) => toNotificationRecord(request.identifier, request.content))
		},
		getPresentedNotificationsAsync: async () => {
			const notifications = await Notifications.getPresentedNotificationsAsync()

			return notifications.map((notification) =>
				toNotificationRecord(notification.request.identifier, notification.request.content),
			)
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
		dismissNotificationAsync: (identifier) => Notifications.dismissNotificationAsync(identifier),
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

function getRecordFingerprint(record: NotificationRecord) {
	const sound = typeof record.content.sound === "string" ? record.content.sound : ""
	const data = record.content.data
	const soundId = isRecord(data) && typeof data.sound === "string" ? data.sound : ""

	return [record.identifier, sound, soundId].join("|")
}

function isHourBeeperNotification(record: NotificationRecord) {
	if (record.identifier.startsWith(NOTIFICATION_ID_PREFIX)) {
		return true
	}

	const data = record.content.data

	return isRecord(data) && data.source === NOTIFICATION_SOURCE
}

function toNotificationRecord(
	identifier: string,
	content: { sound?: string | boolean | null; data?: Record<string, unknown> },
): NotificationRecord {
	return {
		identifier,
		content: {
			sound: content.sound,
			data: content.data,
		},
	}
}

async function loadNotificationRuntimeModule(): Promise<NotificationRuntimeModule> {
	const Notifications = await import("expo-notifications")

	return {
		setNotificationHandler: Notifications.setNotificationHandler,
		addNotificationReceivedListener: Notifications.addNotificationReceivedListener,
	}
}

async function loadAppStateAdapter(): Promise<AppStateAdapter> {
	const { AppState } = await import("react-native")
	return AppState
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}
