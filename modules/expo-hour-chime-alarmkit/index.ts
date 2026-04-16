import { requireNativeModule } from "expo-modules-core"

export type AlarmKitAuthorizationStatus = "authorized" | "denied" | "notDetermined" | "unavailable"

export interface AlarmKitArtifact {
	id: string
	slotKey: string
	hour: number
	minute: number
	weekdays: number[]
	title: string
	soundName: string
}

export interface ExpoHourChimeAlarmKitModuleType {
	isAvailableAsync(): Promise<boolean>
	getAuthorizationStatusAsync(): Promise<AlarmKitAuthorizationStatus>
	requestAuthorizationAsync(): Promise<AlarmKitAuthorizationStatus>
	scheduleAlarmsAsync(artifacts: AlarmKitArtifact[]): Promise<string[]>
	cancelAllAsync(): Promise<void>
	listScheduledAsync(): Promise<AlarmKitArtifact[]>
}

export default requireNativeModule<ExpoHourChimeAlarmKitModuleType>("ExpoHourChimeAlarmKit")
