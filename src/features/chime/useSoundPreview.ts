import { setAudioModeAsync, useAudioPlayer } from "expo-audio"
import { useEffect, useMemo } from "react"

import { configureAppOwnedChimeAudio } from "./audioPolicy"
import { createSoundPreviewController } from "./soundPreview"
import { getSoundPreviewSource } from "./soundPreviewAssets"

export function useSoundPreview() {
	const player = useAudioPlayer(null)
	const controller = useMemo(
		() => createSoundPreviewController({ player, resolveSource: getSoundPreviewSource }),
		[player],
	)

	useEffect(() => {
		void configureAppOwnedChimeAudio(setAudioModeAsync)
	}, [])

	return controller.previewSound
}
