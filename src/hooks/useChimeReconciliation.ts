import { chimeSettingsAtom } from "@/features/chime/atoms"
import { recordReconciliation } from "@/features/chime/diagnostics"
import { createExpoNotificationClient } from "@/features/chime/notificationEngine"
import { reconcileChimeSchedule, type SchedulerDependencies } from "@/features/chime/scheduler"
import type { ChimePermissionStatus, ChimeSettings } from "@/features/chime/types"
import { diagnosticsAtom } from "@/storage/persist"
import { useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect, useRef, useState } from "react"

interface ReconciliationState {
	notificationPermission: ChimePermissionStatus
	isReconciling: boolean
	lastReconciledAt: string | null
}

export function useChimeReconciliation() {
	const settings = useAtomValue(chimeSettingsAtom)
	const setDiagnostics = useSetAtom(diagnosticsAtom)
	const [state, setState] = useState<ReconciliationState>({
		notificationPermission: "unknown",
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

				const notificationPermission = result?.permission.status

				setState((prev) => ({
					...prev,
					isReconciling: false,
					lastReconciledAt: new Date().toISOString(),
					notificationPermission: notificationPermission ?? prev.notificationPermission,
				}))

				setDiagnostics((prev) =>
					recordReconciliation(prev, {
						status: result?.status ?? "no-op",
						artifactCount: result?.requestCount ?? null,
						notificationPermission,
					}),
				)
			} catch (error) {
				console.warn("[useChimeReconciliation] Reconciliation failed:", error)

				if (mountedRef.current) {
					setState((prev) => ({ ...prev, isReconciling: false }))
				}

				setDiagnostics((prev) =>
					recordReconciliation(prev, {
						status: "error",
						artifactCount: null,
						error: error instanceof Error ? error.message : String(error),
					}),
				)
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
