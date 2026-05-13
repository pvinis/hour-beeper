import { describe, expect, it, vi } from "vitest"

import { APP_OWNED_CHIME_AUDIO_MODE, configureAppOwnedChimeAudio } from "./audioPolicy"

describe("app-owned chime audio policy", () => {
	it("mixes short app-owned chimes with other media without enabling background playback", () => {
		expect(APP_OWNED_CHIME_AUDIO_MODE).toEqual({
			allowsRecording: false,
			interruptionMode: "mixWithOthers",
			playsInSilentMode: true,
			shouldPlayInBackground: false,
		})
	})

	it("applies the shared audio mode through the provided adapter", async () => {
		const setAudioMode = vi.fn().mockResolvedValue(undefined)

		await configureAppOwnedChimeAudio(setAudioMode)

		expect(setAudioMode).toHaveBeenCalledWith(APP_OWNED_CHIME_AUDIO_MODE)
	})
})
