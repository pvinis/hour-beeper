import { atomWithStorage } from "@/utils/atomWithStorage"
import { DEFAULT_CHIME_SETTINGS, sanitizeChimeSettings } from "@/features/chime/schedule"

export const chimeSettingsAtom = atomWithStorage(
	"hour-beeper.chime-settings",
	DEFAULT_CHIME_SETTINGS,
	{
		sanitize: sanitizeChimeSettings,
	},
)
