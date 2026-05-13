import { createAudioPlayer, setAudioModeAsync } from "expo-audio"

import { createAppOwnedChimePlayback, type AppOwnedChimePlayback } from "./chimePlayback"
import { getSoundPreviewSource } from "./soundPreviewAssets"

let defaultPlayback: AppOwnedChimePlayback | null = null

export function getDefaultAppOwnedChimePlayback() {
	defaultPlayback ??= createAppOwnedChimePlayback({
		player: createAudioPlayer(null),
		resolveSource: getSoundPreviewSource,
		setAudioMode: setAudioModeAsync,
	})

	return defaultPlayback
}
