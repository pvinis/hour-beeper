import type { ChimePermissionStatus } from "./types"

export interface NotificationPermissionResponse {
	granted?: boolean
	status?: string
	canAskAgain?: boolean
	ios?: {
		allowsDisplayInCarPlay?: boolean | null
	}
}

export interface NotificationPermissionRequestOptions {
	ios?: {
		allowAlert?: boolean
		allowBadge?: boolean
		allowSound?: boolean
		allowDisplayInCarPlay?: boolean
	}
}

export interface NotificationPermissionClient {
	getPermissionsAsync(): Promise<NotificationPermissionResponse>
	requestPermissionsAsync(
		options?: NotificationPermissionRequestOptions,
	): Promise<NotificationPermissionResponse>
}

export type CarPlayDisplayPermissionStatus = "allowed" | "disabled" | "unknown"

export interface NotificationPermissionState {
	status: ChimePermissionStatus
	canAskAgain: boolean
	isGranted: boolean
	carPlayDisplayStatus: CarPlayDisplayPermissionStatus
}

export async function getNotificationPermissionState(
	client: NotificationPermissionClient,
): Promise<NotificationPermissionState> {
	return mapNotificationPermissionResponse(await client.getPermissionsAsync())
}

export async function requestNotificationPermissionState(
	client: NotificationPermissionClient,
): Promise<NotificationPermissionState> {
	return mapNotificationPermissionResponse(
		await client.requestPermissionsAsync({
			ios: {
				allowAlert: true,
				allowBadge: false,
				allowSound: true,
				allowDisplayInCarPlay: true,
			},
		}),
	)
}

export function mapNotificationPermissionResponse(
	response: NotificationPermissionResponse,
): NotificationPermissionState {
	const status = normalizeNotificationPermissionStatus(response)

	return {
		status,
		canAskAgain: response.canAskAgain ?? status !== "denied",
		isGranted: status === "granted",
		carPlayDisplayStatus: getCarPlayDisplayPermissionStatus(response),
	}
}

export async function openNotificationSettings() {
	const { Linking } = await import("react-native")

	await Linking.openSettings()
}

function getCarPlayDisplayPermissionStatus(
	response: NotificationPermissionResponse,
): CarPlayDisplayPermissionStatus {
	if (response.ios?.allowsDisplayInCarPlay === true) {
		return "allowed"
	}

	if (response.ios?.allowsDisplayInCarPlay === false) {
		return "disabled"
	}

	return "unknown"
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
