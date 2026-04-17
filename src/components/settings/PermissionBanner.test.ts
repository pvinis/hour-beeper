import { describe, expect, it } from "vitest"

import { getPermissionBannerContent } from "./permissionBannerModel"

describe("getPermissionBannerContent", () => {
	it("surfaces a request CTA when the active delivery mode still needs permission", () => {
		const banner = getPermissionBannerContent({
			notificationStatus: "granted",
			alarmkitStatus: "unknown",
			deliveryMode: "alarmkit",
		})

		expect(banner).toEqual({
			tone: "warning",
			title: "AlarmKit permission required",
			message: "Allow AlarmKit permission to let Hour Beeper schedule chimes in this mode.",
			action: "request",
			actionLabel: "Allow AlarmKit",
		})
	})

	it("prioritizes unavailable state for AlarmKit devices that do not support it", () => {
		const banner = getPermissionBannerContent({
			notificationStatus: "granted",
			alarmkitStatus: "unavailable",
			deliveryMode: "alarmkit",
		})

		expect(banner).toEqual({
			tone: "warning",
			title: "AlarmKit unavailable",
			message: "AlarmKit requires iOS 26 or later. Notification mode is still available.",
			action: null,
		})
	})

	it("keeps denied permissions pointed at Settings", () => {
		const banner = getPermissionBannerContent({
			notificationStatus: "denied",
			alarmkitStatus: "granted",
			deliveryMode: "notification",
		})

		expect(banner).toEqual({
			tone: "blocked",
			title: "Notification permission denied",
			message: "Open Settings to grant permission for chimes to work.",
			action: "settings",
			actionLabel: "Open Settings",
		})
	})
})
