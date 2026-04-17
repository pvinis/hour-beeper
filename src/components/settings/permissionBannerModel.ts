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
	alarmkitStatus,
	deliveryMode,
}: {
	notificationStatus: ChimePermissionStatus
	alarmkitStatus: ChimePermissionStatus
	deliveryMode: "notification" | "alarmkit"
}): PermissionBannerContent | null {
	const modeLabel = deliveryMode === "notification" ? "Notification" : "AlarmKit"
	const activeStatus = deliveryMode === "notification" ? notificationStatus : alarmkitStatus

	if (deliveryMode === "alarmkit" && alarmkitStatus === "unavailable") {
		return {
			tone: "warning",
			title: "AlarmKit unavailable",
			message: "AlarmKit requires iOS 26 or later. Notification mode is still available.",
			action: null,
		}
	}

	if (activeStatus === "denied") {
		return {
			tone: "blocked",
			title: `${modeLabel} permission denied`,
			message: "Open Settings to grant permission for chimes to work.",
			action: "settings",
			actionLabel: "Open Settings",
		}
	}

	if (activeStatus === "unknown") {
		return {
			tone: "warning",
			title: `${modeLabel} permission required`,
			message: `Allow ${modeLabel} permission to let Hour Beeper schedule chimes in this mode.`,
			action: "request",
			actionLabel: `Allow ${modeLabel}`,
		}
	}

	return null
}
