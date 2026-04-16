import { DateTime } from "luxon"

import {
	reconcileAlarmKitSchedule,
	type AlarmKitClient,
	type AlarmKitReconciliationResult,
} from "./alarmkitEngine"
import {
	reconcileNotificationSchedule,
	type NotificationClient,
	type NotificationReconciliationResult,
} from "./notificationEngine"
import { materializeUpcomingOccurrences } from "./schedule"
import type { ChimeSettings, MaterializedChimeOccurrence } from "./types"

export interface SchedulerSnapshot {
	settings: ChimeSettings
	timeZone: string
	occurrences: MaterializedChimeOccurrence[]
}

export interface SchedulerDependencies {
	notificationClient?: NotificationClient
	alarmkitClient?: AlarmKitClient
}

export function createSchedulerSnapshot(
	settings: ChimeSettings,
	options: {
		from?: DateTime
		count?: number
	} = {},
): SchedulerSnapshot {
	const from = options.from ?? DateTime.local()

	return {
		settings,
		timeZone: from.zoneName ?? "local",
		occurrences: settings.enabled
			? materializeUpcomingOccurrences(settings.schedule, options)
			: [],
	}
}

export interface SchedulerReconciliationResult {
	notification: NotificationReconciliationResult | null
	alarmkit: AlarmKitReconciliationResult | null
}

export async function reconcileChimeSchedule(
	settings: ChimeSettings,
	dependencies: SchedulerDependencies,
	options: {
		from?: DateTime
		count?: number
		requestPermissionsIfNeeded?: boolean
	} = {},
): Promise<SchedulerReconciliationResult | null> {
	const notification = dependencies.notificationClient
		? await reconcileNotificationSchedule(dependencies.notificationClient, settings, options)
		: null
	const alarmkit = dependencies.alarmkitClient
		? await reconcileAlarmKitSchedule(dependencies.alarmkitClient, settings, options)
		: null

	if (!notification && !alarmkit) {
		return null
	}

	return {
		notification,
		alarmkit,
	}
}

export function getNextScheduledOccurrence(
	settings: ChimeSettings,
	from: DateTime = DateTime.local(),
) {
	return createSchedulerSnapshot(settings, { from, count: 1 }).occurrences[0] ?? null
}
