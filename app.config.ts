import "tsx/cjs"

import { execSync } from "child_process"
import type { ExpoConfig } from "@expo/config-types"
import packageJson from "./package.json" with { type: "json" }

type AppVariant = "development" | "staging" | "production"

type VariantConfig = {
	name: string
	slug: string
	scheme: string
	ios: {
		bundleIdentifier: string
		icon: string
	}
}

const appConfigDevelopment: VariantConfig = {
	name: "Hour Beeper Dev",
	slug: "hour-beeper",
	scheme: "hour-beeper-dev",
	ios: {
		bundleIdentifier: "com.pvinis.hourbeeper.dev",
		icon: "./assets/app-icon-dev.png",
	},
}

const appConfigStaging: VariantConfig = {
	name: "Hour Beeper Staging",
	slug: "hour-beeper",
	scheme: "hour-beeper-staging",
	ios: {
		bundleIdentifier: "com.pvinis.hourbeeper.stag",
		icon: "./assets/app-icon-staging.png",
	},
}

const appConfigProduction: VariantConfig = {
	name: "Hour Beeper",
	slug: "hour-beeper",
	scheme: "hour-beeper",
	ios: {
		bundleIdentifier: "com.pvinis.hourbeeper",
		icon: "./assets/app-icon.png",
	},
}

const configs: Record<AppVariant, VariantConfig> = {
	development: appConfigDevelopment,
	staging: appConfigStaging,
	production: appConfigProduction,
}

const isAppVariant = (value: string): value is AppVariant => value in configs
const envVariant = process.env.APP_VARIANT ?? "development"
const appVariant: AppVariant = isAppVariant(envVariant) ? envVariant : "development"
const appConfig = configs[appVariant]

const gitCommit = (() => {
	try {
		return execSync("git rev-parse --short HEAD").toString().trim()
	} catch {
		return "unknown"
	}
})()

export default (): ExpoConfig => ({
	name: appConfig.name,
	slug: appConfig.slug,
	version: packageJson.version,
	scheme: appConfig.scheme,
	owner: "pvinis",
	orientation: "portrait",
	userInterfaceStyle: "automatic",
	icon: appConfig.ios.icon,
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
		buildCacheProvider: {
			plugin: "expo-build-disk-cache",
			options: {
				cacheDir: "node_modules/.expo-build-disk-cache",
				remotePlugin: "eas",
			},
		},
		tsconfigPaths: true,
		typedRoutes: true,
	},
	assetBundlePatterns: ["**/*"],
	ios: {
		appleTeamId: "CAG2W9M777",
		bundleIdentifier: appConfig.ios.bundleIdentifier,
		icon: appConfig.ios.icon,
		infoPlist: {
			ITSAppUsesNonExemptEncryption: false,
			NSAlarmKitUsageDescription:
				"Hour Beeper uses AlarmKit to schedule reliable chimes even when the app is closed.",
		},
	},
	extra: {
		eas: { projectId: "9c602eea-1e88-4851-8243-4046d4a056d9" },
		gitCommit,
	},
})
