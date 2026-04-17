import { chimeSettingsAtom } from "@/features/chime/atoms"
import { recordReconciliation } from "@/features/chime/diagnostics"
import { diagnosticsAtom } from "@/storage/persist"
import { createExpoNotificationClient } from "@/features/chime/notificationEngine"
import { reconcileChimeSchedule, type SchedulerDependencies } from "@/features/chime/scheduler"
import type { ChimePermissionStatus, ChimeSettings } from "@/features/chime/types"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect, useRef, useState } from "react"

interface ReconciliationState {
	notificationPermission: ChimePermissionStatus
	alarmkitPermission: ChimePermissionStatus
	isReconciling: boolean
	lastReconciledAt: string | null
}

export function useChimeReconciliation() {
	const settings = useAtomValue(chimeSettingsAtom)
	const setDiagnostics = useSetAtom(diagnosticsAtom)
	const [state, setState] = useState<ReconciliationState>({
		notificationPermission: "unknown",
		alarmkitPermission: "unknown",
		isReconciling: false,
		lastReconciledAt: null,
	})
	const depsRef = useRef<SchedulerDependencies | null>(null)
	const mountedRef = useRef(true)

	const reconcile = useCallback(
		async (currentSettings: ChimeSettings, requestPermissionsIfNeeded: boolean) => {
			if (!depsRef.current || !mountedRef.current) {
				return
			}

			setState((prev) => ({ ...prev, isReconciling: true }))

			try {
				const result = await reconcileChimeSchedule(currentSettings, depsRef.current, {
					requestPermissionsIfNeeded,
				})

				if (!mountedRef.current) {
					return
				}

				const notifPerm = result?.notification?.permission.status
				const akPerm = result?.alarmkit?.permission.status
				const activeResult = currentSettings.deliveryMode === "alarmkit" ? result?.alarmkit : result?.notification

				setState((prev) => ({
					...prev,
					isReconciling: false,
					lastReconciledAt: new Date().toISOString(),
					notificationPermission: notifPerm ?? prev.notificationPermission,
					alarmkitPermission: akPerm ?? prev.alarmkitPermission,
				}))

				setDiagnostics((prev) =>
					recordReconciliation(prev, {
						mode: currentSettings.deliveryMode,
						status: activeResult?.status ?? "no-op",
						artifactCount: activeResult?.requestCount ?? null,
						notificationPermission: notifPerm,
						alarmkitPermission: akPerm,
					}),
				)
			} catch (error) {
				console.warn("[useChimeReconciliation] Reconciliation failed:", error)

				if (mountedRef.current) {
					setState((prev) => ({ ...prev, isReconciling: false }))
				}
			}
		},
		[setDiagnostics],
	)

	useEffect(() => {
		mountedRef.current = true

		void initDependencies()

		return () => {
			mountedRef.current = false
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps -- initDependencies is stable; deps init once on mount
	}, [])

	useEffect(() => {
		void reconcile(settings, false)
	}, [settings, reconcile])

	async function initDependencies() {
		try {
			const notificationClient = await createExpoNotificationClient()
			depsRef.current = { notificationClient }

			try {
				const { createExpoAlarmKitClient } = await import("@/features/chime/alarmkitEngine")
				const alarmkitClient = await createExpoAlarmKitClient()
				if (alarmkitClient) {
					depsRef.current.alarmkitClient = alarmkitClient
				}
			} catch {
				// AlarmKit unavailable — keep notification-only deps
			}

			await reconcile(settings, false)
		} catch (error) {
			console.warn("[useChimeReconciliation] Failed to initialize:", error)
		}
	}

	const requestPermissions = useCallback(
		async (nextSettings: ChimeSettings = settings) => {
			await reconcile(nextSettings, true)
		},
		[reconcile, settings],
	)

	return {
		...state,
		requestPermissions,
	}
}
