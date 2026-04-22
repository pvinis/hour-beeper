import { describe, expect, it } from "vitest"

import { getPermissionBannerContent } from "./permissionBannerModel"

describe("getPermissionBannerContent", () => {
	it("surfaces a request CTA when notification permission is still unknown", () => {
		const banner = getPermissionBannerContent({
			notificationStatus: "unknown",
		})

		expect(banner).toEqual({
			tone: "warning",
			title: "Notification permission required",
			message: "Allow notifications so Hour Beeper can schedule chimes.",
			action: "request",
			actionLabel: "Allow Notifications",
		})
	})

	it("keeps denied permissions pointed at Settings", () => {
		const banner = getPermissionBannerContent({
			notificationStatus: "denied",
		})

		expect(banner).toEqual({
			tone: "blocked",
			title: "Notification permission denied",
			message: "Open Settings to grant permission for chimes to work.",
			action: "settings",
			actionLabel: "Open Settings",
		})
	})

	it("returns no banner when notification permission is already granted", () => {
		const banner = getPermissionBannerContent({
			notificationStatus: "granted",
		})

		expect(banner).toBeNull()
	})
})
