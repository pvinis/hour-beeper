export interface AppOwnedChimeAudioMode {
	allowsRecording: false
	interruptionMode: "mixWithOthers"
	playsInSilentMode: true
	shouldPlayInBackground: false
}

export type SetAudioMode = (mode: AppOwnedChimeAudioMode) => Promise<void> | void

// Applies only to app-owned chime playback through expo-audio. OS-delivered
// local notification sounds have platform-owned audio behavior.
export const APP_OWNED_CHIME_AUDIO_MODE = {
	allowsRecording: false,
	interruptionMode: "mixWithOthers",
	playsInSilentMode: true,
	shouldPlayInBackground: false,
} as const satisfies AppOwnedChimeAudioMode

export async function configureAppOwnedChimeAudio(setAudioMode: SetAudioMode) {
	await setAudioMode(APP_OWNED_CHIME_AUDIO_MODE)
}
