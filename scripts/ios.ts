#!/usr/bin/env bun

import { execSync, spawnSync } from "child_process"

import { parseConnectedPhysicalIosDevices } from "./iosDeviceTarget"

const connectedDevices = getConnectedPhysicalIosDevices()

if (connectedDevices.length === 0) {
	console.error(
		"No connected physical iOS devices found. `bun ios` is reserved for physical-device installs. Connect an iPhone or run `bun x expo run:ios` for Simulator work.",
	)
	process.exit(1)
}

if (connectedDevices.length > 1) {
	console.log("Multiple connected physical iOS devices detected:")
	for (const device of connectedDevices) {
		console.log(`- ${device.name} (${device.identifier})`)
	}
	console.log("\nFalling back to Expo's interactive device picker.\n")

	const result = spawnSync("expo", ["run:ios", "--device"], {
		stdio: "inherit",
		env: process.env,
	})
	process.exit(result.status ?? 0)
}

const device = connectedDevices[0]!

console.log(`\nRunning for physical device: ${device.name} (${device.identifier})\n`)

const result = spawnSync("expo", ["run:ios", "--device", device.identifier], {
	stdio: "inherit",
	env: process.env,
})

process.exit(result.status ?? 0)

function getConnectedPhysicalIosDevices() {
	try {
		const xcdeviceList = execSync("xcrun xcdevice list", {
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		})

		return parseConnectedPhysicalIosDevices(xcdeviceList)
	} catch {
		return []
	}
}
