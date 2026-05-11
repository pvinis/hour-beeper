import "tsx/cjs"

import { execSync } from "child_process"
import type { ExpoConfig } from "@expo/config-types"
import packageJson from "./package.json" with { type: "json" }
import {
	ANDROID_NOTIFICATION_SOUND_PATHS,
	DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID,
	NOTIFICATION_SOUND_PATHS,
} from "./src/features/chime/sounds"

type AppVariant = "development" | "staging" | "production"

type VariantConfig = {
	name: string
	slug: string
	scheme: string
	ios: {
		bundleIdentifier: string
		icon: string
	}
	android: {
		package: string
		icon: string
	}
}

const appConfigDevelopment: VariantConfig = {
	name: "Hour Bell Dev",
	slug: "hour-beeper",
	scheme: "hour-beeper-dev",
	ios: {
		bundleIdentifier: "com.pvinis.hourbeeper.dev",
		icon: "./assets/app-icon-dev.png",
	},
	android: {
		package: "com.pvinis.hourbeeper.dev",
		icon: "./assets/app-icon-dev.png",
	},
}

const appConfigStaging: VariantConfig = {
	name: "Hour Bell Staging",
	slug: "hour-beeper",
	scheme: "hour-beeper-staging",
	ios: {
		bundleIdentifier: "com.pvinis.hourbeeper.stag",
		icon: "./assets/app-icon-staging.png",
	},
	android: {
		package: "com.pvinis.hourbeeper.stag",
		icon: "./assets/app-icon-staging.png",
	},
}

const appConfigProduction: VariantConfig = {
	name: "Hour Bell",
	slug: "hour-beeper",
	scheme: "hour-beeper",
	ios: {
		bundleIdentifier: "com.pvinis.hourbeeper",
		icon: "./assets/app-icon.png",
	},
	android: {
		package: "com.pvinis.hourbeeper",
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
				icon: "./assets/notification-icon-android.png",
				color: "#f5c542",
				defaultChannel: DEFAULT_ANDROID_NOTIFICATION_CHANNEL_ID,
				sounds: ANDROID_NOTIFICATION_SOUND_PATHS,
			},
		],
		[
			"./plugins/withNotificationSoundsOnly",
			{
				sounds: NOTIFICATION_SOUND_PATHS,
			},
		],
		"./plugins/withLocalNotificationsOnly",
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
		},
	},
	android: {
		package: appConfig.android.package,
		icon: appConfig.android.icon,
		adaptiveIcon: {
			foregroundImage: appConfig.android.icon,
			backgroundColor: "#111111",
		},
		permissions: ["android.permission.POST_NOTIFICATIONS"],
	},
	extra: {
		eas: { projectId: "9c602eea-1e88-4851-8243-4046d4a056d9" },
		gitCommit,
	},
})
