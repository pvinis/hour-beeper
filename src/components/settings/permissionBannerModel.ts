import type { ChimePermissionStatus } from "../../features/chime/types"

export interface PermissionBannerContent {
	tone: "blocked" | "warning"
	title: string
	message: string
	action: "request" | "settings" | null
	actionLabel?: string
}

export function getPermissionBannerContent({
	notificationStatus,
}: {
	notificationStatus: ChimePermissionStatus
}): PermissionBannerContent | null {
	if (notificationStatus === "denied") {
		return {
			tone: "blocked",
			title: "Notification permission denied",
			message: "Open Settings to grant permission for chimes to work.",
			action: "settings",
			actionLabel: "Open Settings",
		}
	}

	if (notificationStatus === "unknown") {
		return {
			tone: "warning",
			title: "Notification permission required",
			message: "Allow notifications so Hour Beeper can schedule chimes.",
			action: "request",
			actionLabel: "Allow Notifications",
		}
	}

	return null
}
