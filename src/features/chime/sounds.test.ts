import { basename } from "path"
import { describe, expect, it } from "vitest"

import { buildNotificationRequests } from "./notificationEngine"
import { DEFAULT_CHIME_SETTINGS } from "./schedule"
import {
	CHIME_SOUND_CATALOG,
	CHIME_SOUND_OPTIONS,
	NOTIFICATION_SOUND_PATHS,
	getNotificationSoundFilename,
} from "./sounds"
import { CHIME_SOUND_IDS } from "./types"

describe("chime sound catalog", () => {
	it("has exactly one metadata entry for every sound id", () => {
		expect(Object.keys(CHIME_SOUND_CATALOG).sort()).toEqual([...CHIME_SOUND_IDS].sort())
	})

	it("preserves sound option order and display metadata", () => {
		expect(CHIME_SOUND_OPTIONS.map((option) => option.id)).toEqual(CHIME_SOUND_IDS)

		for (const option of CHIME_SOUND_OPTIONS) {
			expect(option.label.length).toBeGreaterThan(0)
			expect(option.notificationFilename).toMatch(/\.wav$/)
		}
	})

	it("uses catalog filenames when building notification requests", () => {
		for (const sound of CHIME_SOUND_IDS) {
			const requests = buildNotificationRequests({
				...DEFAULT_CHIME_SETTINGS,
				enabled: true,
				sound,
			})

			expect(requests.map((request) => request.content.sound)).toEqual([
				getNotificationSoundFilename(sound),
			])
		}
	})

	it("keeps native notification sound paths aligned with catalog filenames", () => {
		expect(NOTIFICATION_SOUND_PATHS.map((path) => basename(path))).toEqual(
			CHIME_SOUND_OPTIONS.map((option) => option.notificationFilename),
		)
	})
})
