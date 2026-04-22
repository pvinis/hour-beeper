import type { ChimePermissionStatus } from "./types"

export interface DiagnosticsState {
	notificationPermission: ChimePermissionStatus
	lastReconciledAt: string | null
	lastScheduledArtifactCount: number | null
	lastError: string | null
	history: DiagnosticsHistoryEntry[]
}

export interface DiagnosticsHistoryEntry {
	timestamp: string
	status: string
	artifactCount: number | null
}

const MAX_HISTORY_ENTRIES = 50

export const DEFAULT_DIAGNOSTICS_STATE: DiagnosticsState = {
	notificationPermission: "unknown",
	lastReconciledAt: null,
	lastScheduledArtifactCount: null,
	lastError: null,
	history: [],
}

export function recordReconciliation(
	prev: DiagnosticsState,
	update: {
		status: string
		artifactCount: number | null
		notificationPermission?: ChimePermissionStatus
		error?: string | null
	},
): DiagnosticsState {
	const timestamp = new Date().toISOString()
	const entry: DiagnosticsHistoryEntry = {
		timestamp,
		status: update.status,
		artifactCount: update.artifactCount,
	}

	return {
		notificationPermission: update.notificationPermission ?? prev.notificationPermission,
		lastReconciledAt: timestamp,
		lastScheduledArtifactCount: update.artifactCount,
		lastError: update.error ?? null,
		history: [entry, ...prev.history].slice(0, MAX_HISTORY_ENTRIES),
	}
}

export function formatReconciliationStatus(status: string) {
	switch (status) {
		case "migrated":
			return "migrated to repeaters"
		case "scheduled":
			return "scheduled"
		case "unchanged":
			return "unchanged"
		case "blocked":
			return "blocked"
		case "cleared":
			return "cleared"
		case "error":
			return "error"
		default:
			return status
	}
}

export function formatRepeaterCount(count: number | null) {
	if (count == null) {
		return "—"
	}

	return `${count} ${count === 1 ? "repeater" : "repeaters"}`
}

export function sanitizeDiagnostics(value: unknown): DiagnosticsState {
	if (!isRecord(value)) {
		return DEFAULT_DIAGNOSTICS_STATE
	}

	return {
		notificationPermission: isPermissionStatus(value.notificationPermission)
			? value.notificationPermission
			: DEFAULT_DIAGNOSTICS_STATE.notificationPermission,
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
			? value.history
					.map(sanitizeDiagnosticsEntry)
					.filter((entry): entry is DiagnosticsHistoryEntry => entry !== null)
					.slice(0, MAX_HISTORY_ENTRIES)
			: [],
	}
}

function sanitizeDiagnosticsEntry(value: unknown): DiagnosticsHistoryEntry | null {
	if (!isRecord(value) || typeof value.timestamp !== "string" || typeof value.status !== "string") {
		return null
	}

	if ("mode" in value && value.mode !== undefined && value.mode !== "notification") {
		return null
	}

	return {
		timestamp: value.timestamp,
		status: value.status,
		artifactCount: typeof value.artifactCount === "number" ? value.artifactCount : null,
	}
}

const PERMISSION_STATUSES = new Set(["unknown", "granted", "denied", "unavailable"])

function isPermissionStatus(value: unknown): value is ChimePermissionStatus {
	return typeof value === "string" && PERMISSION_STATUSES.has(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}
