#!/usr/bin/env bun

import { execSync, spawnSync } from "child_process"

let bootedDevices = ""

try {
	bootedDevices = execSync("xcrun simctl list devices booted", {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "ignore"],
	})
} catch {
	bootedDevices = ""
}

const deviceIds = [...bootedDevices.matchAll(/\(([A-F0-9-]+)\) \(Booted\)/gi)]
	.map((match) => match[1])
	.filter((id): id is string => Boolean(id))

if (deviceIds.length === 0) {
	const result = spawnSync("expo", ["run:ios", "--device"], {
		stdio: "inherit",
		env: process.env,
	})
	process.exit(result.status ?? 0)
}

for (const deviceId of deviceIds) {
	console.log(`\nRunning for device: ${deviceId}\n`)
	const result = spawnSync("expo", ["run:ios", "--device", deviceId], {
		stdio: "inherit",
		env: process.env,
	})

	if ((result.status ?? 0) !== 0) {
		process.exit(result.status ?? 1)
	}
}
