import "tsx/cjs"

import { execSync } from "child_process"
import type { ExpoConfig } from "@expo/config-types"
import packageJson from "./package.json" with { type: "json" }

const gitCommit = (() => {
	try {
		return execSync("git rev-parse --short HEAD").toString().trim()
	} catch {
		return "unknown"
	}
})()

export default (): ExpoConfig => ({
	name: "Hour Beeper",
	slug: "hour-beeper",
	version: packageJson.version,
	scheme: "hour-beeper",
	orientation: "portrait",
	userInterfaceStyle: "automatic",
	icon: "./assets/app-icon.png",
	plugins: [
		"./plugins/withXcodeEnv",
		"expo-router",
		"expo-sqlite",
		[
			"expo-notifications",
			{
				sounds: [
					"./assets/sounds/casio-beep.wav",
					"./assets/sounds/classic-beep.wav",
					"./assets/sounds/soft-beep.wav",
					"./assets/sounds/digital-beep.wav",
				],
			},
		],
		["expo-dev-client", { launchMode: "most-recent" }],
	],
	experiments: {
		tsconfigPaths: true,
		typedRoutes: true,
	},
	assetBundlePatterns: ["**/*"],
	ios: {
		bundleIdentifier: "com.pvinis.hourbeeper",
		icon: "./assets/app-icon.png",
		infoPlist: {
			ITSAppUsesNonExemptEncryption: false,
			NSAlarmKitUsageDescription:
				"Hour Beeper uses AlarmKit to schedule reliable chimes even when the app is closed.",
		},
	},
	extra: {
		gitCommit,
	},
})
