#!/usr/bin/env bun

import { spawnSync } from "child_process"

const nonInteractive = process.argv.includes("--non-interactive")
const niArgs = nonInteractive ? ["--non-interactive"] : []

main()

function main() {
	const buildId = getLatestFinishedStagingIosBuildId()
	console.log(`Found latest staging iOS build: ${buildId}`)
	resignBuild(buildId)
	console.log("Build re-signed successfully!")
}

function getLatestFinishedStagingIosBuildId(): string {
	const result = spawnSync(
		"bun",
		[
			"x",
			"eas-cli@latest",
			"build:list",
			"--platform",
			"ios",
			"--build-profile",
			"staging",
			"--status",
			"finished",
			"--limit",
			"1",
			"--json",
			...niArgs,
		],
		{
			encoding: "utf8",
			stdio: ["inherit", "pipe", "inherit"],
		},
	)

	if (result.status !== 0) {
		throw new Error(`Failed to list staging builds (exit code ${result.status})`)
	}

	let builds: Array<{ id?: string }>
	try {
		builds = JSON.parse(result.stdout.trim())
	} catch {
		console.error("Failed to parse EAS build:list JSON output:", result.stdout.slice(0, 500))
		throw new Error("EAS build:list returned non-JSON output")
	}

	if (!Array.isArray(builds) || builds.length === 0 || !builds[0]?.id) {
		console.error("No finished staging iOS builds found")
		process.exit(1)
	}

	return builds[0].id
}

function resignBuild(buildId: string) {
	const result = spawnSync(
		"bun",
		[
			"x",
			"eas-cli@latest",
			"build:resign",
			"--id",
			buildId,
			"--platform",
			"ios",
			"--target-profile",
			"staging",
			"--no-wait",
			...niArgs,
		],
		{
			stdio: "inherit",
		},
	)

	if (result.status !== 0) {
		throw new Error(`EAS build:resign failed with exit code ${result.status}`)
	}
}
