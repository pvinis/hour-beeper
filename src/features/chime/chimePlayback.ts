import { configureAppOwnedChimeAudio, type SetAudioMode } from "./audioPolicy"
import {
	createSoundPreviewController,
	type SoundPreviewPlayer,
	type SoundPreviewSource,
} from "./soundPreview"
import type { ChimeSound } from "./types"

export interface AppOwnedChimePlayback {
	playChime: (sound: ChimeSound) => Promise<void>
}

export interface AppOwnedChimePlaybackOptions {
	player: SoundPreviewPlayer
	resolveSource: (sound: ChimeSound) => SoundPreviewSource
	setAudioMode: SetAudioMode
	reportError?: (error: unknown, sound: ChimeSound) => void
}

export function createAppOwnedChimePlayback({
	player,
	resolveSource,
	setAudioMode,
	reportError = reportChimePlaybackError,
}: AppOwnedChimePlaybackOptions): AppOwnedChimePlayback {
	const controller = createSoundPreviewController({
		player,
		resolveSource,
		reportError,
	})
	let playbackRequestId = 0

	return {
		async playChime(sound) {
			const requestId = ++playbackRequestId

			try {
				await configureAppOwnedChimeAudio(setAudioMode)
			} catch (error) {
				reportError(error, sound)
				return
			}

			if (requestId === playbackRequestId) {
				await controller.previewSound(sound)
			}
		},
	}
}

function reportChimePlaybackError(error: unknown, sound: ChimeSound) {
	console.warn(`[chimePlayback] Failed to play ${sound}:`, error)
}
