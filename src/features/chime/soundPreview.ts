import type { AudioSource } from "expo-audio"

import type { ChimeSound } from "./types"

export type SoundPreviewSource = AudioSource

export interface SoundPreviewPlayer {
	pause?: () => void
	play: () => void
	replace: (source: SoundPreviewSource) => void
	seekTo: (seconds: number) => Promise<void> | void
}

export interface SoundPreviewControllerOptions {
	player: SoundPreviewPlayer
	resolveSource: (sound: ChimeSound) => SoundPreviewSource
	reportError?: (error: unknown, sound: ChimeSound) => void
}

export interface SoundPreviewController {
	previewSound: (sound: ChimeSound) => Promise<void>
}

export function createSoundPreviewController({
	player,
	resolveSource,
	reportError = reportSoundPreviewError,
}: SoundPreviewControllerOptions): SoundPreviewController {
	let previewRequestId = 0

	return {
		async previewSound(sound) {
			const requestId = ++previewRequestId

			try {
				const source = resolveSource(sound)

				player.pause?.()
				player.replace(source)
				await player.seekTo(0)

				if (requestId === previewRequestId) {
					player.play()
				}
			} catch (error) {
				reportError(error, sound)
			}
		},
	}
}

function reportSoundPreviewError(error: unknown, sound: ChimeSound) {
	console.warn(`[soundPreview] Failed to preview ${sound}:`, error)
}
