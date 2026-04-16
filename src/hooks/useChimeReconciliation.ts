import { chimeSettingsAtom } from "@/features/chime/atoms"
import { createExpoNotificationClient } from "@/features/chime/notificationEngine"
import { reconcileChimeSchedule, type SchedulerDependencies } from "@/features/chime/scheduler"
import type { ChimePermissionStatus, ChimeSettings } from "@/features/chime/types"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useRef, useState } from "react"

interface ReconciliationState {
	notificationPermission: ChimePermissionStatus
	alarmkitPermission: ChimePermissionStatus
	isReconciling: boolean
	lastReconciledAt: string | null
}

export function useChimeReconciliation() {
	const settings = useAtomValue(chimeSettingsAtom)
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

				setState((prev) => ({
					...prev,
					isReconciling: false,
					lastReconciledAt: new Date().toISOString(),
					notificationPermission:
						result?.notification?.permission.status ?? prev.notificationPermission,
					alarmkitPermission:
						result?.alarmkit?.permission.status ?? prev.alarmkitPermission,
				}))
			} catch (error) {
				console.warn("[useChimeReconciliation] Reconciliation failed:", error)

				if (mountedRef.current) {
					setState((prev) => ({ ...prev, isReconciling: false }))
				}
			}
		},
		[],
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
				depsRef.current.alarmkitClient = alarmkitClient
			} catch {
				// AlarmKit unavailable — keep notification-only deps
			}

			await reconcile(settings, false)
		} catch (error) {
			console.warn("[useChimeReconciliation] Failed to initialize:", error)
		}
	}

	const requestPermissions = useCallback(async () => {
		await reconcile(settings, true)
	}, [reconcile, settings])

	return {
		...state,
		requestPermissions,
	}
}
