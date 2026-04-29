import { setAudioModeAsync, useAudioPlayer } from "expo-audio"
import { useEffect, useMemo } from "react"

import { createSoundPreviewController } from "./soundPreview"
import { getSoundPreviewSource } from "./soundPreviewAssets"

export function useSoundPreview() {
	const player = useAudioPlayer(null)
	const controller = useMemo(
		() => createSoundPreviewController({ player, resolveSource: getSoundPreviewSource }),
		[player],
	)

	useEffect(() => {
		void setAudioModeAsync({
			allowsRecording: false,
			interruptionMode: "mixWithOthers",
			playsInSilentMode: true,
			shouldPlayInBackground: false,
		})
	}, [])

	return controller.previewSound
}
