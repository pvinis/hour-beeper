import { describe, expect, it } from "vitest"

import {
	DEFAULT_DIAGNOSTICS_STATE,
	recordReconciliation,
	type DiagnosticsState,
} from "./diagnostics"

describe("recordReconciliation", () => {
	it("reflects current mode, permissions, and most recent reconciliation", () => {
		const next = recordReconciliation(DEFAULT_DIAGNOSTICS_STATE, {
			mode: "notification",
			status: "scheduled",
			artifactCount: 24,
			notificationPermission: "granted",
		})

		expect(next.activeMode).toBe("notification")
		expect(next.notificationPermission).toBe("granted")
		expect(next.lastScheduledArtifactCount).toBe(24)
		expect(next.lastReconciledAt).toBeTruthy()
		expect(next.lastError).toBeNull()
		expect(next.history).toHaveLength(1)
		expect(next.history[0]?.status).toBe("scheduled")
	})

	it("preserves historical comparison context across mode switches", () => {
		let state = DEFAULT_DIAGNOSTICS_STATE

		state = recordReconciliation(state, {
			mode: "notification",
			status: "scheduled",
			artifactCount: 24,
			notificationPermission: "granted",
		})

		state = recordReconciliation(state, {
			mode: "alarmkit",
			status: "scheduled",
			artifactCount: 2,
			alarmkitPermission: "granted",
		})

		expect(state.activeMode).toBe("alarmkit")
		expect(state.notificationPermission).toBe("granted")
		expect(state.alarmkitPermission).toBe("granted")
		expect(state.history).toHaveLength(2)
		expect(state.history[0]?.mode).toBe("alarmkit")
		expect(state.history[1]?.mode).toBe("notification")
	})

	it("records failed reconciliation with actionable error state", () => {
		const state = recordReconciliation(DEFAULT_DIAGNOSTICS_STATE, {
			mode: "notification",
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
					mode: "notification",
					status: "scheduled",
					artifactCount: 24,
				},
			],
			lastReconciledAt: "2026-04-15T10:00:00.000Z",
		}

		state = recordReconciliation(state, {
			mode: "notification",
			status: "scheduled",
			artifactCount: 24,
			notificationPermission: "granted",
		})

		expect(state.history).toHaveLength(2)
		expect(state.history[1]?.timestamp).toBe("2026-04-15T10:00:00.000Z")
	})
})
