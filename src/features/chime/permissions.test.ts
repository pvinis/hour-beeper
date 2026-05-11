import { describe, expect, it } from "vitest"

import { mapNotificationPermissionResponse } from "./permissions"

describe("mapNotificationPermissionResponse", () => {
	it("keeps general notification grant separate from CarPlay display permission", () => {
		expect(
			mapNotificationPermissionResponse({
				granted: true,
				status: "granted",
				ios: { allowsDisplayInCarPlay: false },
			}),
		).toEqual({
			status: "granted",
			canAskAgain: true,
			isGranted: true,
			carPlayDisplayStatus: "disabled",
		})
	})

	it("treats absent CarPlay display status as unknown for upgraded users", () => {
		expect(
			mapNotificationPermissionResponse({
				granted: true,
				status: "granted",
			}),
		).toEqual({
			status: "granted",
			canAskAgain: true,
			isGranted: true,
			carPlayDisplayStatus: "unknown",
		})
	})

	it("maps explicit CarPlay display permission when iOS exposes it", () => {
		expect(
			mapNotificationPermissionResponse({
				granted: true,
				status: "granted",
				ios: { allowsDisplayInCarPlay: true },
			}).carPlayDisplayStatus,
		).toBe("allowed")
	})
})
