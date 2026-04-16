import type { ChimePermissionStatus } from "./types"

export interface NotificationPermissionResponse {
	granted?: boolean
	status?: string
	canAskAgain?: boolean
}

export interface NotificationPermissionClient {
	getPermissionsAsync(): Promise<NotificationPermissionResponse>
	requestPermissionsAsync(): Promise<NotificationPermissionResponse>
}

export interface NotificationPermissionState {
	status: ChimePermissionStatus
	canAskAgain: boolean
	isGranted: boolean
}

export async function getNotificationPermissionState(
	client: NotificationPermissionClient,
): Promise<NotificationPermissionState> {
	return mapNotificationPermissionResponse(await client.getPermissionsAsync())
}

export async function requestNotificationPermissionState(
	client: NotificationPermissionClient,
): Promise<NotificationPermissionState> {
	return mapNotificationPermissionResponse(await client.requestPermissionsAsync())
}

export function mapNotificationPermissionResponse(
	response: NotificationPermissionResponse,
): NotificationPermissionState {
	const status = normalizeNotificationPermissionStatus(response)

	return {
		status,
		canAskAgain: response.canAskAgain ?? status !== "denied",
		isGranted: status === "granted",
	}
}

export async function openNotificationSettings() {
	const { Linking } = await import("react-native")

	await Linking.openSettings()
}

function normalizeNotificationPermissionStatus(
	response: NotificationPermissionResponse,
): ChimePermissionStatus {
	if (response.granted || response.status === "granted" || response.status === "provisional") {
		return "granted"
	}

	if (response.status === "denied") {
		return "denied"
	}

	return "unknown"
}
