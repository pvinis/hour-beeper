import { describe, expect, it, vi } from "vitest"

import { createSoundPreviewController, type SoundPreviewPlayer } from "./soundPreview"
import { CHIME_SOUND_IDS } from "./types"

describe("createSoundPreviewController", () => {
	it("restarts and plays the requested preview source", async () => {
		const player = createFakePlayer()
		const controller = createSoundPreviewController({
			player,
			resolveSource: (sound) => `source:${sound}`,
		})

		await controller.previewSound("casio")

		expect(player.pause).toHaveBeenCalledTimes(1)
		expect(player.replace).toHaveBeenCalledWith("source:casio")
		expect(player.seekTo).toHaveBeenCalledWith(0)
		expect(player.play).toHaveBeenCalledTimes(1)
	})

	it("restarts the same sound on repeated preview requests", async () => {
		const player = createFakePlayer()
		const controller = createSoundPreviewController({
			player,
			resolveSource: (sound) => `source:${sound}`,
		})

		await controller.previewSound("low")
		await controller.previewSound("low")

		expect(player.replace).toHaveBeenCalledTimes(2)
		expect(player.replace).toHaveBeenNthCalledWith(1, "source:low")
		expect(player.replace).toHaveBeenNthCalledWith(2, "source:low")
		expect(player.seekTo).toHaveBeenCalledTimes(2)
		expect(player.play).toHaveBeenCalledTimes(2)
	})

	it("keeps the latest rapid preview request active", async () => {
		const firstSeek = createDeferred<void>()
		const player = createFakePlayer({
			seekTo: vi.fn().mockReturnValueOnce(firstSeek.promise).mockResolvedValueOnce(undefined),
		})
		const controller = createSoundPreviewController({
			player,
			resolveSource: (sound) => `source:${sound}`,
		})

		const firstPreview = controller.previewSound("low")
		const secondPreview = controller.previewSound("mid")
		await secondPreview

		expect(player.replace).toHaveBeenNthCalledWith(1, "source:low")
		expect(player.replace).toHaveBeenNthCalledWith(2, "source:mid")
		expect(player.play).toHaveBeenCalledTimes(1)

		firstSeek.resolve()
		await firstPreview

		expect(player.play).toHaveBeenCalledTimes(1)
	})

	it("contains playback errors without rejecting", async () => {
		const error = new Error("preview failed")
		const reportError = vi.fn()
		const player = createFakePlayer({
			replace: vi.fn(() => {
				throw error
			}),
		})
		const controller = createSoundPreviewController({
			player,
			resolveSource: (sound) => `source:${sound}`,
			reportError,
		})

		await expect(controller.previewSound("classic")).resolves.toBeUndefined()
		expect(reportError).toHaveBeenCalledWith(error, "classic")
		expect(player.play).not.toHaveBeenCalled()
	})

	it("can resolve preview sources for every sound id", async () => {
		const player = createFakePlayer()
		const controller = createSoundPreviewController({
			player,
			resolveSource: (sound) => `source:${sound}`,
		})

		for (const sound of CHIME_SOUND_IDS) {
			await controller.previewSound(sound)
		}

		expect(player.replace).toHaveBeenCalledTimes(CHIME_SOUND_IDS.length)
		expect(player.replace).toHaveBeenLastCalledWith("source:low")
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
