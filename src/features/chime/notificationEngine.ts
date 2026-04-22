import {
	getNotificationPermissionState,
	requestNotificationPermissionState,
	type NotificationPermissionClient,
	type NotificationPermissionResponse,
	type NotificationPermissionState,
} from "./permissions"
import { getScheduleTimes } from "./schedule"
import type { ChimeSettings, ChimeSound, LocalTime } from "./types"

const NOTIFICATION_ID_PREFIX = "hour-beeper.notification"
const NOTIFICATION_SOURCE = "hour-beeper"
const NOTIFICATION_THREAD_IDENTIFIER = "hour-beeper.chimes"
const REPEATING_INTERVAL_SECONDS = 60

const SOUND_FILES: Record<ChimeSound, string> = {
	casio: "casio-beep.wav",
	classic: "classic-beep.wav",
	soft: "soft-beep.wav",
	digital: "digital-beep.wav",
}

export interface HourBeeperNotificationData extends Record<string, unknown> {
	source: typeof NOTIFICATION_SOURCE
	slotKey: string
	triggerType: "calendar" | "timeInterval"
	sound: ChimeSound
}

export interface HourBeeperNotificationContent {
	title: string
	body: string
	sound: string
	data: HourBeeperNotificationData
	threadIdentifier: string
	interruptionLevel: "active"
}

export type HourBeeperNotificationTrigger =
	| {
			type: "calendar"
			repeats: true
			hour?: number
			minute?: number
			second?: number
			timezone?: string
	  }
	| {
			type: "timeInterval"
			repeats: true
			seconds: number
	  }

export interface HourBeeperNotificationRequest {
	identifier: string
	trigger: HourBeeperNotificationTrigger
	content: HourBeeperNotificationContent
}

export type NotificationTriggerRecord =
	| {
			type: "calendar"
			repeats?: boolean
			hour?: number
			minute?: number
			second?: number
			timezone?: string | null
	  }
	| {
			type: "timeInterval"
			repeats?: boolean
			seconds: number
	  }
	| {
			type: "date"
			date?: string | number | Date | null
	  }
	| {
			type: "unknown"
			rawType?: string | null
	  }

interface NotificationRecordContent {
	sound?: string | boolean | null
	data?: Record<string, unknown>
	threadIdentifier?: string | null
}

export interface NotificationRecord {
	identifier: string
	content: NotificationRecordContent
	trigger?: NotificationTriggerRecord | null
	date?: number | null
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
	status: "scheduled" | "migrated" | "unchanged" | "cleared" | "blocked"
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
	date: number
	request: {
		identifier: string
		content: NotificationRecordContent
		trigger?: unknown
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
	_options: {
		from?: unknown
		count?: number
	} = {},
): HourBeeperNotificationRequest[] {
	if (!settings.enabled) {
		return []
	}

	const slots = getNotificationSlots(settings)

	return slots.map((slot) => ({
		identifier: createNotificationIdentifier(slot),
		trigger: slot.trigger,
		content: {
			title: "Hour Beeper",
			body: slot.body,
			sound: SOUND_FILES[settings.sound],
			data: {
				source: NOTIFICATION_SOURCE,
				slotKey: slot.slotKey,
				triggerType: slot.trigger.type,
				sound: settings.sound,
			},
			threadIdentifier: NOTIFICATION_THREAD_IDENTIFIER,
			interruptionLevel: "active",
		},
	}))
}

export async function reconcileNotificationSchedule(
	client: NotificationClient,
	settings: ChimeSettings,
	options: {
		from?: unknown
		count?: number
		requestPermissionsIfNeeded?: boolean
	} = {},
): Promise<NotificationReconciliationResult> {
	const permission = options.requestPermissionsIfNeeded
		? await requestNotificationPermissionState(client)
		: await getNotificationPermissionState(client)
	const existing = (await client.getAllScheduledNotificationsAsync()).filter(isHourBeeperNotification)

	if (!settings.enabled) {
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
	const didMigrateLegacyRequests = existing.some((record) => record.trigger?.type === "date")

	for (const request of desired) {
		scheduledIds.push(await client.scheduleNotificationAsync(request))
	}

	return {
		status: didMigrateLegacyRequests ? "migrated" : "scheduled",
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

export async function dismissPreviousPresentedHourBeeperNotification(
	client: NotificationClient,
	currentRecord: PresentedNotificationRecord,
) {
	if (!isHourBeeperNotification(currentRecord)) {
		return null
	}

	const currentDeliveredAt = getNotificationSortTimestamp(currentRecord)
	if (currentDeliveredAt === null) {
		return null
	}

	try {
		const orderedPresented = getOrderedPresentedHourBeeperNotifications([
			...(await client.getPresentedNotificationsAsync()),
			currentRecord,
		])
		const currentIndex = orderedPresented.findIndex(({ record }) => record === currentRecord)
		const previousRecord = currentIndex > 0 ? orderedPresented[currentIndex - 1]?.record : null

		if (!previousRecord || getNotificationSortTimestamp(previousRecord) === currentDeliveredAt && previousRecord.identifier === currentRecord.identifier) {
			return null
		}

		const didDismiss = await dismissPresentedNotificationIfOwned(client, previousRecord)
		return didDismiss ? previousRecord.identifier : null
	} catch (error) {
		console.warn("[notificationEngine] Failed to dismiss previous presented notification:", error)
		return null
	}
}

export async function dismissPresentedHourBeeperNotifications(client: NotificationClient) {
	try {
		const orderedPresented = getOrderedPresentedHourBeeperNotifications(
			await client.getPresentedNotificationsAsync(),
		)
		if (orderedPresented.length <= 1) {
			return []
		}

		const dismissedIds: string[] = []
		for (const { record } of orderedPresented.slice(0, -1)) {
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
		void dismissPreviousPresentedHourBeeperNotification(client, {
			identifier: notification.request.identifier,
			content: notification.request.content,
			trigger: normalizeTrigger(notification.request.trigger),
			date: notification.date,
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

			return requests.map((request) =>
				toNotificationRecord(request.identifier, request.content, normalizeTrigger(request.trigger)),
			)
		},
		getPresentedNotificationsAsync: async () => {
			const notifications = await Notifications.getPresentedNotificationsAsync()

			return notifications.map((notification) =>
				toNotificationRecord(
					notification.request.identifier,
					notification.request.content,
					normalizeTrigger(notification.request.trigger),
					notification.date,
				),
			)
		},
		scheduleNotificationAsync: (request) =>
			Notifications.scheduleNotificationAsync({
				identifier: request.identifier,
				content: request.content,
				trigger: toExpoTriggerInput(Notifications, request.trigger),
			}),
		cancelScheduledNotificationAsync: (identifier) =>
			Notifications.cancelScheduledNotificationAsync(identifier),
		dismissNotificationAsync: (identifier) => Notifications.dismissNotificationAsync(identifier),
	}
}

interface NotificationSlot {
	slotKey: string
	body: string
	trigger: HourBeeperNotificationTrigger
}

function getNotificationSlots(settings: ChimeSettings): NotificationSlot[] {
	if (settings.schedule.kind === "preset") {
		switch (settings.schedule.preset) {
			case "every-minute":
				return [
					{
						slotKey: `interval:${REPEATING_INTERVAL_SECONDS}s`,
						body: "Chime every minute",
						trigger: {
							type: "timeInterval",
							repeats: true,
							seconds: REPEATING_INTERVAL_SECONDS,
						},
					},
				]
			case "hourly":
				return [createMinuteOnlySlot(0)]
			case "every-30-minutes":
				return [createMinuteOnlySlot(0), createMinuteOnlySlot(30)]
		}
	}

	return getScheduleTimes(settings.schedule).map(createLocalTimeSlot)
}

function createMinuteOnlySlot(minute: number): NotificationSlot {
	return {
		slotKey: `minute:${pad2(minute)}`,
		body: `Chime for :${pad2(minute)}`,
		trigger: {
			type: "calendar",
			repeats: true,
			minute,
		},
	}
}

function createLocalTimeSlot(localTime: LocalTime): NotificationSlot {
	return {
		slotKey: toSlotKey(localTime),
		body: `Chime for ${toSlotKey(localTime)}`,
		trigger: {
			type: "calendar",
			repeats: true,
			hour: localTime.hour,
			minute: localTime.minute,
		},
	}
}

function createNotificationIdentifier(slot: NotificationSlot) {
	return `${NOTIFICATION_ID_PREFIX}.${slot.trigger.type}.${normalizeIdentifierSegment(slot.slotKey)}`
}

function toSlotKey(localTime: LocalTime) {
	return `${pad2(localTime.hour)}:${pad2(localTime.minute)}`
}

function normalizeIdentifierSegment(value: string) {
	return value.replaceAll(":", "-")
}

function pad2(value: number) {
	return value.toString().padStart(2, "0")
}

function hasMatchingNotificationPlan(
	existing: ScheduledNotificationRecord[],
	desired: HourBeeperNotificationRequest[],
) {
	if (existing.length !== desired.length) {
		return false
	}

	const existingFingerprints = new Set(existing.map(getRecordFingerprint))

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
	return [
		request.identifier,
		request.content.sound,
		request.content.data.sound,
		request.content.threadIdentifier,
		request.content.data.slotKey,
		request.content.data.triggerType,
		getTriggerFingerprint(request.trigger),
	].join("|")
}

function getRecordFingerprint(record: NotificationRecord) {
	const sound = typeof record.content.sound === "string" ? record.content.sound : ""
	const data = record.content.data
	const soundId = isRecord(data) && typeof data.sound === "string" ? data.sound : ""
	const threadIdentifier = typeof record.content.threadIdentifier === "string"
		? record.content.threadIdentifier
		: ""
	const slotKey = getDataSlotKey(data) ?? ""
	const triggerType = getDataTriggerType(data) ?? ""

	return [
		record.identifier,
		sound,
		soundId,
		threadIdentifier,
		slotKey,
		triggerType,
		getTriggerFingerprint(record.trigger),
	].join("|")
}

function getTriggerFingerprint(trigger?: NotificationTriggerRecord | HourBeeperNotificationTrigger | null) {
	if (!trigger) {
		return "none"
	}

	switch (trigger.type) {
		case "calendar":
			return [
				"calendar",
				trigger.repeats ? "repeat" : "once",
				trigger.hour ?? "*",
				trigger.minute ?? "*",
				trigger.second ?? "*",
				trigger.timezone ?? "local",
			].join(":")
		case "timeInterval":
			return ["timeInterval", trigger.repeats ? "repeat" : "once", trigger.seconds].join(":")
		case "date":
			return "date:stale"
		case "unknown":
			return `unknown:${trigger.rawType ?? "unknown"}`
		default: {
			const exhaustiveTrigger: never = trigger
			return exhaustiveTrigger
		}
	}
}

function getOrderedPresentedHourBeeperNotifications(records: PresentedNotificationRecord[]) {
	return records
		.filter(isHourBeeperNotification)
		.map((record) => ({
			record,
			sortTimestamp: getNotificationSortTimestamp(record),
			slotKey: getDataSlotKey(record.content.data) ?? "",
		}))
		.sort((left, right) => {
			const leftTimestamp = left.sortTimestamp ?? Number.NEGATIVE_INFINITY
			const rightTimestamp = right.sortTimestamp ?? Number.NEGATIVE_INFINITY

			if (leftTimestamp !== rightTimestamp) {
				return leftTimestamp - rightTimestamp
			}

			if (left.slotKey !== right.slotKey) {
				return left.slotKey.localeCompare(right.slotKey)
			}

			return left.record.identifier.localeCompare(right.record.identifier)
		})
}

function getNotificationSortTimestamp(record: NotificationRecord) {
	if (typeof record.date === "number" && Number.isFinite(record.date)) {
		return record.date
	}

	if (record.trigger?.type === "date") {
		const triggerDate = toTimestamp(record.trigger.date)
		if (triggerDate !== null) {
			return triggerDate
		}
	}

	const data = record.content.data
	if (isRecord(data) && typeof data.scheduledFor === "string") {
		return toTimestamp(data.scheduledFor)
	}

	return null
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
	content: {
		sound?: string | boolean | null
		data?: Record<string, unknown>
		threadIdentifier?: string | null
	},
	trigger?: NotificationTriggerRecord | null,
	date?: number | null,
): NotificationRecord {
	return {
		identifier,
		content: {
			sound: content.sound,
			data: content.data,
			threadIdentifier: content.threadIdentifier,
		},
		trigger: trigger ?? null,
		date: typeof date === "number" ? date : null,
	}
}

function normalizeTrigger(trigger: unknown): NotificationTriggerRecord | null {
	if (!isRecord(trigger) || typeof trigger.type !== "string") {
		return null
	}

	switch (trigger.type) {
		case "calendar":
			return {
				type: "calendar",
				repeats: typeof trigger.repeats === "boolean" ? trigger.repeats : undefined,
				hour: toInteger(trigger.hour),
				minute: toInteger(trigger.minute),
				second: toInteger(trigger.second),
				timezone: typeof trigger.timezone === "string" ? trigger.timezone : null,
			}
		case "timeInterval":
			return typeof trigger.seconds === "number"
				? {
						type: "timeInterval",
						repeats: typeof trigger.repeats === "boolean" ? trigger.repeats : undefined,
						seconds: trigger.seconds,
					}
				: { type: "unknown", rawType: trigger.type }
		case "date":
			return {
				type: "date",
				date:
					trigger.date instanceof Date || typeof trigger.date === "number" || typeof trigger.date === "string"
						? trigger.date
						: null,
			}
		default:
			return {
				type: "unknown",
				rawType: trigger.type,
			}
	}
}

function toExpoTriggerInput(
	Notifications: typeof import("expo-notifications"),
	trigger: HourBeeperNotificationTrigger,
): import("expo-notifications").NotificationTriggerInput {
	switch (trigger.type) {
		case "calendar":
			return {
				type: Notifications.SchedulableTriggerInputTypes.CALENDAR as import("expo-notifications").SchedulableTriggerInputTypes.CALENDAR,
				repeats: trigger.repeats,
				hour: trigger.hour,
				minute: trigger.minute,
				second: trigger.second,
			}
		case "timeInterval":
			return {
				type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL as import("expo-notifications").SchedulableTriggerInputTypes.TIME_INTERVAL,
				repeats: trigger.repeats,
				seconds: trigger.seconds,
			}
		default: {
			const exhaustiveTrigger: never = trigger
			return exhaustiveTrigger
		}
	}
}

function getDataSlotKey(data: unknown) {
	return isRecord(data) && typeof data.slotKey === "string" ? data.slotKey : null
}

function getDataTriggerType(data: unknown) {
	return isRecord(data) && typeof data.triggerType === "string" ? data.triggerType : null
}

function toTimestamp(value: unknown) {
	if (typeof value === "number" && Number.isFinite(value)) {
		return value
	}

	if (value instanceof Date) {
		const millis = value.getTime()
		return Number.isFinite(millis) ? millis : null
	}

	if (typeof value === "string") {
		const millis = Date.parse(value)
		return Number.isNaN(millis) ? null : millis
	}

	return null
}

function toInteger(value: unknown) {
	return typeof value === "number" && Number.isInteger(value) ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
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
