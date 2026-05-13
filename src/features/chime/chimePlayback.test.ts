import { describe, expect, it, vi } from "vitest"

import { APP_OWNED_CHIME_AUDIO_MODE } from "./audioPolicy"
import { createAppOwnedChimePlayback } from "./chimePlayback"
import type { SoundPreviewPlayer } from "./soundPreview"

describe("createAppOwnedChimePlayback", () => {
	it("applies the app-owned audio policy before playing the requested chime", async () => {
		const player = createFakePlayer()
		const setAudioMode = vi.fn().mockResolvedValue(undefined)
		const playback = createAppOwnedChimePlayback({
			player,
			resolveSource: (sound) => `source:${sound}`,
			setAudioMode,
		})

		await playback.playChime("bellio")

		expect(setAudioMode).toHaveBeenCalledWith(APP_OWNED_CHIME_AUDIO_MODE)
		expect(player.replace).toHaveBeenCalledWith("source:bellio")
		expect(player.seekTo).toHaveBeenCalledWith(0)
		expect(player.play).toHaveBeenCalledTimes(1)
	})

	it("replays repeated requests for the same sound", async () => {
		const player = createFakePlayer()
		const playback = createAppOwnedChimePlayback({
			player,
			resolveSource: (sound) => `source:${sound}`,
			setAudioMode: vi.fn().mockResolvedValue(undefined),
		})

		await playback.playChime("low")
		await playback.playChime("low")

		expect(player.replace).toHaveBeenCalledTimes(2)
		expect(player.play).toHaveBeenCalledTimes(2)
	})

	it("keeps the latest rapid request active when audio policy setup resolves out of order", async () => {
		const firstAudioMode = createDeferred<void>()
		const player = createFakePlayer()
		const playback = createAppOwnedChimePlayback({
			player,
			resolveSource: (sound) => `source:${sound}`,
			setAudioMode: vi.fn().mockReturnValueOnce(firstAudioMode.promise).mockResolvedValueOnce(undefined),
		})

		const first = playback.playChime("low")
		const second = playback.playChime("mid")
		await second

		expect(player.replace).toHaveBeenCalledTimes(1)
		expect(player.replace).toHaveBeenCalledWith("source:mid")

		firstAudioMode.resolve()
		await first

		expect(player.replace).toHaveBeenCalledTimes(1)
		expect(player.play).toHaveBeenCalledTimes(1)
	})


	it("contains audio policy setup failures", async () => {
		const error = new Error("audio mode failed")
		const reportError = vi.fn()
		const player = createFakePlayer()
		const playback = createAppOwnedChimePlayback({
			player,
			resolveSource: (sound) => `source:${sound}`,
			setAudioMode: vi.fn().mockRejectedValue(error),
			reportError,
		})

		await expect(playback.playChime("classic")).resolves.toBeUndefined()

		expect(reportError).toHaveBeenCalledWith(error, "classic")
		expect(player.play).not.toHaveBeenCalled()
	})

	it("contains source resolution failures", async () => {
		const error = new Error("resolve failed")
		const reportError = vi.fn()
		const player = createFakePlayer()
		const playback = createAppOwnedChimePlayback({
			player,
			resolveSource: () => {
				throw error
			},
			setAudioMode: vi.fn().mockResolvedValue(undefined),
			reportError,
		})

		await expect(playback.playChime("classic")).resolves.toBeUndefined()

		expect(reportError).toHaveBeenCalledWith(error, "classic")
		expect(player.play).not.toHaveBeenCalled()
	})

	it("contains seek failures", async () => {
		const error = new Error("seek failed")
		const reportError = vi.fn()
		const player = createFakePlayer({
			seekTo: vi.fn().mockRejectedValue(error),
		})
		const playback = createAppOwnedChimePlayback({
			player,
			resolveSource: (sound) => `source:${sound}`,
			setAudioMode: vi.fn().mockResolvedValue(undefined),
			reportError,
		})

		await expect(playback.playChime("classic")).resolves.toBeUndefined()

		expect(reportError).toHaveBeenCalledWith(error, "classic")
		expect(player.play).not.toHaveBeenCalled()
	})

	it("contains play failures", async () => {
		const error = new Error("play failed")
		const reportError = vi.fn()
		const player = createFakePlayer({
			play: vi.fn(() => {
				throw error
			}),
		})
		const playback = createAppOwnedChimePlayback({
			player,
			resolveSource: (sound) => `source:${sound}`,
			setAudioMode: vi.fn().mockResolvedValue(undefined),
			reportError,
		})

		await expect(playback.playChime("classic")).resolves.toBeUndefined()

		expect(reportError).toHaveBeenCalledWith(error, "classic")
	})

	it("contains playback failures", async () => {
		const error = new Error("replace failed")
		const reportError = vi.fn()
		const player = createFakePlayer({
			replace: vi.fn(() => {
				throw error
			}),
		})
		const playback = createAppOwnedChimePlayback({
			player,
			resolveSource: (sound) => `source:${sound}`,
			setAudioMode: vi.fn().mockResolvedValue(undefined),
			reportError,
		})

		await expect(playback.playChime("classic")).resolves.toBeUndefined()

		expect(reportError).toHaveBeenCalledWith(error, "classic")
		expect(player.play).not.toHaveBeenCalled()
	})
})

function createFakePlayer(overrides: Partial<SoundPreviewPlayer> = {}) {
	return {
		pause: vi.fn(),
		play: vi.fn(),
		replace: vi.fn(),
		seekTo: vi.fn().mockResolvedValue(undefined),
		...overrides,
	} satisfies SoundPreviewPlayer
}

function createDeferred<T>() {
	let resolve: (value: T | PromiseLike<T>) => void = () => {}
	let reject: (reason?: unknown) => void = () => {}
	const promise = new Promise<T>((promiseResolve, promiseReject) => {
		resolve = promiseResolve
		reject = promiseReject
	})

	return { promise, resolve, reject }
}
