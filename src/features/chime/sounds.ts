import { CHIME_SOUND_IDS, type ChimeSound } from "./types"

interface ChimeSoundMetadata {
	id: ChimeSound
	label: string
	notificationFilename: string
	androidNotificationFilename: string
	androidChannelId: string
}

export const CHIME_SOUND_CATALOG = {
	bellio: {
		id: "bellio",
		label: "Bellio",
		notificationFilename: "bellio_beep.wav",
		androidNotificationFilename: "bellio_beep.wav",
		androidChannelId: "hour_beeper_chime_bellio",
	},
	mid: {
		id: "mid",
		label: "Mid",
		notificationFilename: "digital_beep.wav",
		androidNotificationFilename: "digital_beep.wav",
		androidChannelId: "hour_beeper_chime_mid",
	},
	classic: {
		id: "classic",
		label: "Classic",
		notificationFilename: "classic_beep.wav",
		androidNotificationFilename: "classic_beep.wav",
		androidChannelId: "hour_beeper_chime_classic",
	},
	low: {
		id: "low",
		label: "Low",
		notificationFilename: "soft_beep.wav",
		androidNotificationFilename: "soft_beep.wav",
		androidChannelId: "hour_beeper_chime_low",
	},
} as const satisfies Record<ChimeSound, ChimeSoundMetadata>

export const CHIME_SOUND_OPTIONS = CHIME_SOUND_IDS.map((id) => CHIME_SOUND_CATALOG[id])

export const NOTIFICATION_SOUND_PATHS = CHIME_SOUND_OPTIONS.map(
	(option) => `./assets/sounds/${option.notificationFilename}`,
)

export const ANDROID_NOTIFICATION_SOUND_PATHS = NOTIFICATION_SOUND_PATHS

export const DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID = CHIME_SOUND_CATALOG.bellio.androidChannelId

export function getChimeSoundLabel(sound: ChimeSound) {
	return CHIME_SOUND_CATALOG[sound].label
}

export function getNotificationSoundFilename(sound: ChimeSound) {
	return CHIME_SOUND_CATALOG[sound].notificationFilename
}

export function getAndroidNotificationSoundFilename(sound: ChimeSound) {
	return CHIME_SOUND_CATALOG[sound].androidNotificationFilename
}

export function getAndroidNotificationChannelId(sound: ChimeSound) {
	return CHIME_SOUND_CATALOG[sound].androidChannelId
}
