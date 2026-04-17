import { getScheduleTimes } from "./schedule"
import type { ChimePermissionStatus, ChimeSettings, ChimeSound } from "./types"

const ALARMKIT_ID_PREFIX = "hour-beeper.alarmkit"
const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const

const SOUND_FILES: Record<ChimeSound, string> = {
	casio: "casio-beep.wav",
	classic: "classic-beep.wav",
	soft: "soft-beep.wav",
	digital: "digital-beep.wav",
}

export type AlarmKitAuthorizationStatus = "authorized" | "denied" | "notDetermined" | "unavailable"

export interface AlarmKitArtifact {
	id: string
	slotKey: string
	hour: number
	minute: number
	weekdays: number[]
	title: string
	soundName: string
}

export interface AlarmKitScheduledRecord {
	id: string
	slotKey: string
	hour: number
	minute: number
	weekdays: number[]
	soundName?: string | null
}

export interface AlarmKitPermissionState {
	status: ChimePermissionStatus
	canAskAgain: boolean
	isGranted: boolean
}

export interface AlarmKitClient {
	isAvailableAsync(): Promise<boolean>
	getAuthorizationStatusAsync(): Promise<AlarmKitAuthorizationStatus>
	requestAuthorizationAsync(): Promise<AlarmKitAuthorizationStatus>
	scheduleAlarmsAsync(artifacts: AlarmKitArtifact[]): Promise<string[]>
	cancelAllAsync(): Promise<void>
	listScheduledAsync(): Promise<AlarmKitScheduledRecord[]>
}

export interface AlarmKitReconciliationResult {
	status: "scheduled" | "unchanged" | "cleared" | "blocked" | "unavailable"
	permission: AlarmKitPermissionState
	scheduledIds: string[]
	requestCount: number
}

export function buildAlarmKitArtifacts(settings: ChimeSettings): AlarmKitArtifact[] {
	if (!settings.enabled || settings.deliveryMode !== "alarmkit") {
		return []
	}

	return getScheduleTimes(settings.schedule).map((localTime) => {
		const slotKey = `${padTime(localTime.hour)}:${padTime(localTime.minute)}`

		return {
			id: createDeterministicUuid(`${ALARMKIT_ID_PREFIX}.${slotKey}`),
			slotKey,
			hour: localTime.hour,
			minute: localTime.minute,
			weekdays: [...ALL_WEEKDAYS],
			title: "Hour Beeper",
			soundName: SOUND_FILES[settings.sound],
		}
	})
}

export async function reconcileAlarmKitSchedule(
	client: AlarmKitClient,
	settings: ChimeSettings,
	options: {
		requestPermissionsIfNeeded?: boolean
	} = {},
): Promise<AlarmKitReconciliationResult> {
	const existing = await client.listScheduledAsync()

	if (settings.deliveryMode !== "alarmkit" || !settings.enabled) {
		if (existing.length > 0) {
			await client.cancelAllAsync()
		}

		return {
			status: "cleared",
			permission: {
				status: "unknown",
				canAskAgain: true,
				isGranted: false,
			},
			scheduledIds: [],
			requestCount: 0,
		}
	}

	const isAvailable = await client.isAvailableAsync()
	if (!isAvailable) {
		if (existing.length > 0) {
			await client.cancelAllAsync()
		}

		return {
			status: "unavailable",
			permission: {
				status: "unavailable",
				canAskAgain: false,
				isGranted: false,
			},
			scheduledIds: [],
			requestCount: 0,
		}
	}

	const authorizationStatus = options.requestPermissionsIfNeeded
		? await client.requestAuthorizationAsync()
		: await client.getAuthorizationStatusAsync()
	const permission = mapAlarmKitPermissionState(authorizationStatus)

	if (!permission.isGranted) {
		if (existing.length > 0) {
			await client.cancelAllAsync()
		}

		return {
			status: "blocked",
			permission,
			scheduledIds: [],
			requestCount: 0,
		}
	}

	const desired = buildAlarmKitArtifacts(settings)

	if (hasMatchingAlarmPlan(existing, desired)) {
		return {
			status: "unchanged",
			permission,
			scheduledIds: [],
			requestCount: desired.length,
		}
	}

	if (existing.length > 0) {
		await client.cancelAllAsync()
	}

	const scheduledIds = await client.scheduleAlarmsAsync(desired)

	return {
		status: "scheduled",
		permission,
		scheduledIds,
		requestCount: desired.length,
	}
}

export async function createExpoAlarmKitClient(): Promise<AlarmKitClient | null> {
	const module = await import("../../../modules/expo-hour-chime-alarmkit")
	const AlarmKitModule = module.default

	if (!AlarmKitModule) {
		return null
	}

	return {
		isAvailableAsync: () => AlarmKitModule.isAvailableAsync(),
		getAuthorizationStatusAsync: () => AlarmKitModule.getAuthorizationStatusAsync(),
		requestAuthorizationAsync: () => AlarmKitModule.requestAuthorizationAsync(),
		scheduleAlarmsAsync: (artifacts) => AlarmKitModule.scheduleAlarmsAsync(artifacts),
		cancelAllAsync: () => AlarmKitModule.cancelAllAsync(),
		listScheduledAsync: () => AlarmKitModule.listScheduledAsync(),
	}
}

function hasMatchingAlarmPlan(existing: AlarmKitScheduledRecord[], desired: AlarmKitArtifact[]) {
	if (existing.length !== desired.length) {
		return false
	}

	const existingFingerprints = new Set(existing.map(getExistingFingerprint))

	if (existingFingerprints.size !== desired.length) {
		return false
	}

	return desired.every((artifact) => existingFingerprints.has(getDesiredFingerprint(artifact)))
}

function getExistingFingerprint(record: AlarmKitScheduledRecord) {
	return [record.id, record.slotKey, record.soundName ?? ""].join("|")
}

function getDesiredFingerprint(artifact: AlarmKitArtifact) {
	return [artifact.id, artifact.slotKey, artifact.soundName].join("|")
}

function mapAlarmKitPermissionState(
	authorizationStatus: AlarmKitAuthorizationStatus,
): AlarmKitPermissionState {
	return {
		status: mapAuthorizationStatus(authorizationStatus),
		canAskAgain: authorizationStatus === "notDetermined",
		isGranted: authorizationStatus === "authorized",
	}
}

function mapAuthorizationStatus(
	authorizationStatus: AlarmKitAuthorizationStatus,
): ChimePermissionStatus {
	switch (authorizationStatus) {
		case "authorized":
			return "granted"
		case "denied":
			return "denied"
		case "unavailable":
			return "unavailable"
		case "notDetermined":
			return "unknown"
	}

	return "unknown"
}

function padTime(value: number) {
	return value.toString().padStart(2, "0")
}

function createDeterministicUuid(seed: string) {
	const hex = [0, 1, 2, 3]
		.map((salt) => hashSeed(`${seed}:${salt}`).toString(16).padStart(8, "0"))
		.join("")
	const timeHighAndVersion = ((parseInt(hex.slice(12, 16), 16) & 0x0fff) | 0x5000)
		.toString(16)
		.padStart(4, "0")
	const clockSeq = ((parseInt(hex.slice(16, 20), 16) & 0x3fff) | 0x8000)
		.toString(16)
		.padStart(4, "0")

	return [
		hex.slice(0, 8),
		hex.slice(8, 12),
		timeHighAndVersion,
		clockSeq,
		hex.slice(20, 32),
	].join("-")
}

function hashSeed(seed: string) {
	let hash = 2166136261

	for (let index = 0; index < seed.length; index += 1) {
		hash ^= seed.charCodeAt(index)
		hash = Math.imul(hash, 16777619)
	}

	return hash >>> 0
}
