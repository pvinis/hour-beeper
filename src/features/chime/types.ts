import type { DateTime } from "luxon"

export const CHIME_SOUND_IDS = ["casio", "classic", "soft", "digital"] as const
export const DELIVERY_MODES = ["notification", "alarmkit"] as const
export const PRESET_SCHEDULE_IDS = [
	"every-5-minutes",
	"every-30-minutes",
	"hourly",
	"every-2-hours",
	"every-4-hours",
] as const

export type ChimeSound = (typeof CHIME_SOUND_IDS)[number]
export type DeliveryMode = (typeof DELIVERY_MODES)[number]
export type PresetScheduleId = (typeof PRESET_SCHEDULE_IDS)[number]

export type ChimePermissionStatus = "unknown" | "granted" | "denied" | "unavailable"

export interface LocalTime {
	hour: number
	minute: number
}

export type ChimeSchedule =
	| {
			kind: "preset"
			preset: PresetScheduleId
	  }
	| {
			kind: "custom"
			times: LocalTime[]
	  }

export interface ChimeSettings {
	enabled: boolean
	schedule: ChimeSchedule
	sound: ChimeSound
	deliveryMode: DeliveryMode
}

export interface ChimePermissionState {
	notifications: ChimePermissionStatus
	alarmkit: ChimePermissionStatus
}

export interface ChimeDiagnosticsSnapshot {
	lastReconciledAt: string | null
	lastScheduledArtifactCount: number | null
	lastError: string | null
}

export interface MaterializedChimeOccurrence {
	id: string
	occursAt: DateTime
	localTime: LocalTime
}
