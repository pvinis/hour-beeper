import { describe, expect, it } from "vitest"

import { formatPermissionStatus } from "./diagnosticsDisplay"

describe("formatPermissionStatus", () => {
	it("explains unknown permission states as not requested yet", () => {
		expect(formatPermissionStatus("unknown")).toBe("not requested yet")
	})

	it("keeps granted and denied states terse", () => {
		expect(formatPermissionStatus("granted")).toBe("granted")
		expect(formatPermissionStatus("denied")).toBe("denied")
	})

	it("clarifies unavailable states as device-level limits", () => {
		expect(formatPermissionStatus("unavailable")).toBe("unavailable on this device")
	})
})
