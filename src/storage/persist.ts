import { atomWithStorage } from "@/utils/atomWithStorage"
import {
	DEFAULT_DIAGNOSTICS_STATE,
	sanitizeDiagnostics,
} from "@/features/chime/diagnostics"
import { DEFAULT_CHIME_SETTINGS, sanitizeChimeSettings } from "@/features/chime/schedule"

export const chimeSettingsAtom = atomWithStorage(
	"hour-beeper.chime-settings",
	DEFAULT_CHIME_SETTINGS,
	{
		sanitize: sanitizeChimeSettings,
	},
)

export const diagnosticsAtom = atomWithStorage(
	"hour-beeper.diagnostics",
	DEFAULT_DIAGNOSTICS_STATE,
	{
		sanitize: sanitizeDiagnostics,
	},
)
