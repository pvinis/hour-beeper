import type { ChimeSound } from "../../features/chime/types"

interface SelectAndPreviewSoundOptions {
	setSound: (sound: ChimeSound) => void
	previewSound: (sound: ChimeSound) => Promise<void> | void
	onPreviewError?: (error: unknown, sound: ChimeSound) => void
}

export function selectAndPreviewSound(
	sound: ChimeSound,
	{ setSound, previewSound, onPreviewError = reportPreviewError }: SelectAndPreviewSoundOptions,
) {
	setSound(sound)

	try {
		const previewResult = previewSound(sound)

		if (isPromiseLike(previewResult)) {
			void previewResult.catch((error: unknown) => onPreviewError(error, sound))
		}
	} catch (error) {
		onPreviewError(error, sound)
	}
}

function isPromiseLike(value: unknown): value is PromiseLike<void> & { catch: Promise<void>["catch"] } {
	return typeof value === "object" && value !== null && "catch" in value
}

function reportPreviewError(error: unknown, sound: ChimeSound) {
	console.warn(`[SoundSection] Failed to preview ${sound}:`, error)
}
