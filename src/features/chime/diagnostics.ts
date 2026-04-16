import type {
	ChimePermissionStatus,
	DeliveryMode,
} from "./types"

export interface DiagnosticsState {
	activeMode: DeliveryMode
	notificationPermission: ChimePermissionStatus
	alarmkitPermission: ChimePermissionStatus
	lastReconciledAt: string | null
	lastScheduledArtifactCount: number | null
	lastError: string | null
	history: DiagnosticsHistoryEntry[]
}

export interface DiagnosticsHistoryEntry {
	timestamp: string
	mode: DeliveryMode
	status: string
	artifactCount: number | null
}

const MAX_HISTORY_ENTRIES = 50

export const DEFAULT_DIAGNOSTICS_STATE: DiagnosticsState = {
	activeMode: "notification",
	notificationPermission: "unknown",
	alarmkitPermission: "unknown",
	lastReconciledAt: null,
	lastScheduledArtifactCount: null,
	lastError: null,
	history: [],
}


export function recordReconciliation(
	prev: DiagnosticsState,
	update: {
		mode: DeliveryMode
		status: string
		artifactCount: number | null
		notificationPermission?: ChimePermissionStatus
		alarmkitPermission?: ChimePermissionStatus
		error?: string | null
	},
): DiagnosticsState {
	const timestamp = new Date().toISOString()
	const entry: DiagnosticsHistoryEntry = {
		timestamp,
		mode: update.mode,
		status: update.status,
		artifactCount: update.artifactCount,
	}

	return {
		activeMode: update.mode,
		notificationPermission: update.notificationPermission ?? prev.notificationPermission,
		alarmkitPermission: update.alarmkitPermission ?? prev.alarmkitPermission,
		lastReconciledAt: timestamp,
		lastScheduledArtifactCount: update.artifactCount,
		lastError: update.error ?? null,
		history: [entry, ...prev.history].slice(0, MAX_HISTORY_ENTRIES),
	}
}

export function sanitizeDiagnostics(value: unknown): DiagnosticsState {
	if (!isRecord(value)) {
		return DEFAULT_DIAGNOSTICS_STATE
	}

	return {
		activeMode:
			value.activeMode === "notification" || value.activeMode === "alarmkit"
				? value.activeMode
				: DEFAULT_DIAGNOSTICS_STATE.activeMode,
		notificationPermission: isPermissionStatus(value.notificationPermission)
			? value.notificationPermission
			: DEFAULT_DIAGNOSTICS_STATE.notificationPermission,
		alarmkitPermission: isPermissionStatus(value.alarmkitPermission)
			? value.alarmkitPermission
			: DEFAULT_DIAGNOSTICS_STATE.alarmkitPermission,
		lastReconciledAt:
			typeof value.lastReconciledAt === "string"
				? value.lastReconciledAt
				: DEFAULT_DIAGNOSTICS_STATE.lastReconciledAt,
		lastScheduledArtifactCount:
			typeof value.lastScheduledArtifactCount === "number"
				? value.lastScheduledArtifactCount
				: DEFAULT_DIAGNOSTICS_STATE.lastScheduledArtifactCount,
		lastError:
			typeof value.lastError === "string"
				? value.lastError
				: DEFAULT_DIAGNOSTICS_STATE.lastError,
		history: Array.isArray(value.history)
			? value.history.filter(isDiagnosticsEntry).slice(0, MAX_HISTORY_ENTRIES)
			: [],
	}
}

function isDiagnosticsEntry(value: unknown): value is DiagnosticsHistoryEntry {
	return (
		isRecord(value) &&
		typeof value.timestamp === "string" &&
		typeof value.mode === "string" &&
		typeof value.status === "string"
	)
}

const PERMISSION_STATUSES = new Set(["unknown", "granted", "denied", "unavailable"])

function isPermissionStatus(value: unknown): value is ChimePermissionStatus {
	return typeof value === "string" && PERMISSION_STATUSES.has(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}
