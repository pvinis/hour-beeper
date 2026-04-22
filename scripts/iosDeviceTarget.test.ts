import { describe, expect, it } from "vitest"

import { parseConnectedPhysicalIosDevices } from "./iosDeviceTarget"

describe("parseConnectedPhysicalIosDevices", () => {
	it("keeps only connected physical iOS devices", () => {
		const devices = parseConnectedPhysicalIosDevices(
			JSON.stringify([
				{
					name: "sim1",
					identifier: "71E3EA8F-79B4-43C4-B91C-292231C8855D",
					platform: "com.apple.platform.iphonesimulator",
					simulator: true,
					available: true,
				},
				{
					name: "My Mac",
					identifier: "00006041-000220980CB8801C",
					platform: "com.apple.platform.macosx",
					simulator: false,
					available: true,
				},
				{
					name: "cadmium",
					identifier: "00008150-001024881187801C",
					platform: "com.apple.platform.iphoneos",
					simulator: false,
					available: true,
				},
				{
					name: "offline phone",
					identifier: "00008150-9999999999999999",
					platform: "com.apple.platform.iphoneos",
					simulator: false,
					available: false,
				},
			]),
		)

		expect(devices).toEqual([
			{
				name: "cadmium",
				identifier: "00008150-001024881187801C",
			},
		])
	})
})
