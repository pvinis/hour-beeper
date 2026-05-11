import { describe, expect, it, vi } from "vitest"

import { selectAndPreviewSound } from "./soundSelectionModel"

describe("selectAndPreviewSound", () => {
	it("selects and previews an unselected sound", () => {
		const setSound = vi.fn()
		const previewSound = vi.fn()

		selectAndPreviewSound("mid", { setSound, previewSound })

		expect(setSound).toHaveBeenCalledWith("mid")
		expect(previewSound).toHaveBeenCalledWith("mid")
	})

	it("previews the current sound when selected again", () => {
		const setSound = vi.fn()
		const previewSound = vi.fn()

		selectAndPreviewSound("bellio", { setSound, previewSound })

		expect(setSound).toHaveBeenCalledWith("bellio")
		expect(previewSound).toHaveBeenCalledWith("bellio")
	})

	it("keeps selection when preview throws synchronously", () => {
		const error = new Error("preview failed")
		const setSound = vi.fn()
		const onPreviewError = vi.fn()
		const previewSound = vi.fn(() => {
			throw error
		})

		selectAndPreviewSound("classic", { setSound, previewSound, onPreviewError })

		expect(setSound).toHaveBeenCalledWith("classic")
		expect(onPreviewError).toHaveBeenCalledWith(error, "classic")
	})

	it("keeps selection when preview rejects asynchronously", async () => {
		const error = new Error("preview rejected")
		const setSound = vi.fn()
		const onPreviewError = vi.fn()
		const previewSound = vi.fn(() => Promise.reject(error))

		selectAndPreviewSound("low", { setSound, previewSound, onPreviewError })
		await Promise.resolve()

		expect(setSound).toHaveBeenCalledWith("low")
		expect(onPreviewError).toHaveBeenCalledWith(error, "low")
	})
})
