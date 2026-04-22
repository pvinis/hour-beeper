import { describe, expect, it } from "vitest"

import {
	DEFAULT_DIAGNOSTICS_STATE,
	recordReconciliation,
	sanitizeDiagnostics,
	type DiagnosticsState,
} from "./diagnostics"

describe("recordReconciliation", () => {
	it("reflects notification permissions and the most recent reconciliation", () => {
		const next = recordReconciliation(DEFAULT_DIAGNOSTICS_STATE, {
			status: "scheduled",
			artifactCount: 24,
			notificationPermission: "granted",
		})

		expect(next.notificationPermission).toBe("granted")
		expect(next.lastScheduledArtifactCount).toBe(24)
		expect(next.lastReconciledAt).toBeTruthy()
		expect(next.lastError).toBeNull()
		expect(next.history).toHaveLength(1)
		expect(next.history[0]?.status).toBe("scheduled")
	})

	it("records failed reconciliation with actionable error state", () => {
		const state = recordReconciliation(DEFAULT_DIAGNOSTICS_STATE, {
			status: "blocked",
			artifactCount: null,
			notificationPermission: "denied",
			error: "Notification permission denied",
		})

		expect(state.lastError).toBe("Notification permission denied")
		expect(state.notificationPermission).toBe("denied")
		expect(state.lastScheduledArtifactCount).toBeNull()
	})

	it("survives app relaunch by persisting across recordReconciliation calls", () => {
		let state: DiagnosticsState = {
			...DEFAULT_DIAGNOSTICS_STATE,
			history: [
				{
					timestamp: "2026-04-15T10:00:00.000Z",
					status: "scheduled",
					artifactCount: 24,
				},
			],
			lastReconciledAt: "2026-04-15T10:00:00.000Z",
		}

		state = recordReconciliation(state, {
			status: "scheduled",
			artifactCount: 24,
			notificationPermission: "granted",
		})

		expect(state.history).toHaveLength(2)
		expect(state.history[1]?.timestamp).toBe("2026-04-15T10:00:00.000Z")
	})
})

describe("sanitizeDiagnostics", () => {
	it("drops legacy AlarmKit-only fields and history entries while keeping notification history", () => {
		const sanitized = sanitizeDiagnostics({
			activeMode: "alarmkit",
			notificationPermission: "granted",
			alarmkitPermission: "granted",
			lastReconciledAt: "2026-04-16T10:00:00.000Z",
			lastScheduledArtifactCount: 2,
			history: [
				{
					timestamp: "2026-04-16T10:00:00.000Z",
					mode: "alarmkit",
					status: "scheduled",
					artifactCount: 2,
				},
				{
					timestamp: "2026-04-15T10:00:00.000Z",
					mode: "notification",
					status: "scheduled",
					artifactCount: 24,
				},
			],
		})

		expect(sanitized.notificationPermission).toBe("granted")
		expect(sanitized.history).toEqual([
			{
				timestamp: "2026-04-15T10:00:00.000Z",
				status: "scheduled",
				artifactCount: 24,
			},
		])
	})

	it("drops unknown legacy history mode values and keeps valid notification entries", () => {
		const sanitized = sanitizeDiagnostics({
			history: [
				{
					timestamp: "2026-04-16T10:00:00.000Z",
					mode: "pigeon",
					status: "scheduled",
					artifactCount: 1,
				},
				{
					timestamp: "2026-04-16T11:00:00.000Z",
					status: "blocked",
					artifactCount: null,
				},
			],
		})

		expect(sanitized.history).toEqual([
			{
				timestamp: "2026-04-16T11:00:00.000Z",
				status: "blocked",
				artifactCount: null,
			},
		])
	})
})
