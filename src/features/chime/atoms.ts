import { atom } from "jotai"

import { chimeSettingsAtom as persistedChimeSettingsAtom } from "@/storage/persist"
import { createSchedulerSnapshot } from "./scheduler"
import type { ChimeSchedule, ChimeSettings, ChimeSound } from "./types"

export const chimeSettingsAtom = persistedChimeSettingsAtom

export const chimeEnabledAtom = atom(
	(get) => get(chimeSettingsAtom).enabled,
	(get, set, enabled: boolean) => {
		set(chimeSettingsAtom, {
			...get(chimeSettingsAtom),
			enabled,
		})
	},
)

export const chimeScheduleAtom = atom(
	(get) => get(chimeSettingsAtom).schedule,
	(get, set, schedule: ChimeSchedule) => {
		set(chimeSettingsAtom, {
			...get(chimeSettingsAtom),
			schedule,
		})
	},
)

export const chimeSoundAtom = atom(
	(get) => get(chimeSettingsAtom).sound,
	(get, set, sound: ChimeSound) => {
		set(chimeSettingsAtom, {
			...get(chimeSettingsAtom),
			sound,
		})
	},
)

export const updateChimeSettingsAtom = atom(
	null,
	(get, set, update: Partial<ChimeSettings>) => {
		set(chimeSettingsAtom, {
			...get(chimeSettingsAtom),
			...update,
		})
	},
)

export const chimeSchedulePreviewAtom = atom((get) => createSchedulerSnapshot(get(chimeSettingsAtom)))
