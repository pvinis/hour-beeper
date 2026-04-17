#!/usr/bin/env bun

import { spawnSync } from "child_process"

const VALID_PROFILES = ["production", "staging", "development", "development-sim"] as const
const VALID_PLATFORMS = ["ios", "android"] as const
const VALID_PROFILE_SET = new Set<string>(VALID_PROFILES)
const VALID_PLATFORM_SET = new Set<string>(VALID_PLATFORMS)

type BuildProfile = (typeof VALID_PROFILES)[number]
type BuildPlatform = (typeof VALID_PLATFORMS)[number]

main()

function main() {
	const { profile, platform, autoSubmit } = parseArgs()
	const buildNumber = kickOffBuild(profile, platform, autoSubmit)
	createAndPushGitTag(buildNumber, profile, platform)
}

function kickOffBuild(
	profile: BuildProfile,
	platform: BuildPlatform,
	autoSubmit: boolean,
): number {
	const easArgs = [
		"x",
		"eas-cli@latest",
		"build",
		"-e",
		profile,
		"-p",
		platform,
		"--non-interactive",
		"--no-wait",
		"--json",
	]

	if (autoSubmit) {
		easArgs.push("--auto-submit")
	}

	console.log(`Running: bun ${easArgs.join(" ")}\n`)

	const result = spawnSync("bun", easArgs, {
		encoding: "utf8",
		stdio: ["inherit", "pipe", "inherit"],
	})

	if (result.status !== 0) {
		throw new Error(`EAS build failed with exit code ${result.status}`)
	}

	const output = result.stdout.trim()

	let builds: Array<{ appBuildVersion?: string; buildNumber?: string }>
	try {
		builds = JSON.parse(output)
	} catch {
		console.error("Failed to parse EAS JSON output:", output.slice(0, 500))
		throw new Error("EAS build returned non-JSON output")
	}

	if (!Array.isArray(builds) || builds.length === 0) {
		throw new Error("EAS build returned no build objects")
	}

	const build = builds[0]
	if (!build) {
		throw new Error("EAS build returned an empty first build")
	}

	const rawBuildNumber = build.appBuildVersion ?? build.buildNumber
	const buildNumber = Number(rawBuildNumber)

	if (!Number.isFinite(buildNumber) || buildNumber <= 0) {
		throw new Error(
			`Could not extract build number from EAS response: ${JSON.stringify(build)}`,
		)
	}

	console.log(`EAS assigned build number: ${buildNumber}`)
	return buildNumber
}

function createAndPushGitTag(
	buildNumber: number,
	profile: BuildProfile,
	platform: BuildPlatform,
) {
	const status = spawnSync("git", ["status", "--porcelain"], {
		encoding: "utf8",
		stdio: ["inherit", "pipe", "inherit"],
	})
	const isDirty = status.stdout.trim().length > 0

	if (isDirty) {
		console.log("Skipping git tag: repository has uncommitted changes")
		return
	}

	const shortProfile = profile
		.replace("production", "prod")
		.replace("staging", "stag")
		.replace("development", "dev")
	const shortPlatform = platform.replace("android", "and")
	const tagName = `build/${shortPlatform}-${shortProfile}-${buildNumber}`

	const tagResult = spawnSync("git", ["tag", tagName], { stdio: "inherit" })
	if (tagResult.status !== 0) {
		console.error(`Failed to create git tag ${tagName}`)
		return
	}

	const pushResult = spawnSync("git", ["push", "origin", tagName], { stdio: "inherit" })
	if (pushResult.status !== 0) {
		console.error(`Failed to push git tag ${tagName} — cleaning up local tag`)
		spawnSync("git", ["tag", "-d", tagName], { stdio: "inherit" })
		return
	}

	console.log(`Created and pushed git tag: ${tagName}`)
}

function parseArgs(): {
	profile: BuildProfile
	platform: BuildPlatform
	autoSubmit: boolean
} {
	const args = process.argv.slice(2)
	const rawProfile = args[0] ?? "staging"
	const rawPlatform = args[1] ?? "ios"
	const autoSubmit = args.includes("--auto-submit")

	if (!isBuildProfile(rawProfile)) {
		console.error(
			`Invalid profile: ${rawProfile}. Must be one of: ${VALID_PROFILES.join(", ")}`,
		)
		process.exit(1)
	}

	if (!isBuildPlatform(rawPlatform)) {
		console.error(
			`Invalid platform: ${rawPlatform}. Must be one of: ${VALID_PLATFORMS.join(", ")}`,
		)
		process.exit(1)
	}

	return { profile: rawProfile, platform: rawPlatform, autoSubmit }
}

function isBuildProfile(value: string): value is BuildProfile {
	return VALID_PROFILE_SET.has(value)
}

function isBuildPlatform(value: string): value is BuildPlatform {
	return VALID_PLATFORM_SET.has(value)
}
