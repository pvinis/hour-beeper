import casioBeep from "@assets/sounds/casio-beep.wav"
import classicBeep from "@assets/sounds/classic-beep.wav"
import digitalBeep from "@assets/sounds/digital-beep.wav"
import softBeep from "@assets/sounds/soft-beep.wav"

import type { SoundPreviewSource } from "./soundPreview"
import { CHIME_SOUND_IDS, type ChimeSound } from "./types"

const SOUND_PREVIEW_SOURCES = {
	casio: casioBeep,
	mid: digitalBeep,
	classic: classicBeep,
	low: softBeep,
} as const satisfies Record<ChimeSound, SoundPreviewSource>

export function getSoundPreviewSource(sound: ChimeSound) {
	return SOUND_PREVIEW_SOURCES[sound]
}

export const SOUND_PREVIEW_SOURCE_IDS = CHIME_SOUND_IDS
