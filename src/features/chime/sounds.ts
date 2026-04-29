import { CHIME_SOUND_IDS, type ChimeSound } from "./types"

interface ChimeSoundMetadata {
	id: ChimeSound
	label: string
	notificationFilename: string
}

export const CHIME_SOUND_CATALOG = {
	casio: {
		id: "casio",
		label: "Casio",
		notificationFilename: "casio-beep.wav",
	},
	mid: {
		id: "mid",
		label: "Mid",
		notificationFilename: "digital-beep.wav",
	},
	classic: {
		id: "classic",
		label: "Classic",
		notificationFilename: "classic-beep.wav",
	},
	low: {
		id: "low",
		label: "Low",
		notificationFilename: "soft-beep.wav",
	},
} as const satisfies Record<ChimeSound, ChimeSoundMetadata>

export const CHIME_SOUND_OPTIONS = CHIME_SOUND_IDS.map((id) => CHIME_SOUND_CATALOG[id])

export const NOTIFICATION_SOUND_PATHS = CHIME_SOUND_OPTIONS.map(
	(option) => `./assets/sounds/${option.notificationFilename}`,
)

export function getChimeSoundLabel(sound: ChimeSound) {
	return CHIME_SOUND_CATALOG[sound].label
}

export function getNotificationSoundFilename(sound: ChimeSound) {
	return CHIME_SOUND_CATALOG[sound].notificationFilename
}
