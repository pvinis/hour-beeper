import { afterEach, describe, expect, it } from "vitest"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import {
	patchUniwind,
	REGISTRY_FILES,
	SAFE_AREA_FILES,
	verifyUniwindCompat,
} from "./uniwind-compat.mjs"

const cleanupDirs: string[] = []

afterEach(() => {
	for (const dir of cleanupDirs.splice(0)) {
		rmSync(dir, { recursive: true, force: true })
	}
})

describe("verifyUniwindCompat", () => {
	it("passes after the compatibility patch is applied", () => {
		const rootDir = mkdtempSync(join(tmpdir(), "hour-beeper-uniwind-verify-"))
		cleanupDirs.push(rootDir)

		for (const filePath of [...REGISTRY_FILES, ...SAFE_AREA_FILES]) {
			const absolutePath = join(rootDir, filePath)
			mkdirSync(dirname(absolutePath), { recursive: true })
			writeFileSync(absolutePath, getFixtureSource(filePath))
		}

		patchUniwind({ cwd: rootDir })

		expect(() => verifyUniwindCompat({ cwd: rootDir })).not.toThrow()
	})

	it("fails when a forbidden marker is still present", () => {
		const rootDir = mkdtempSync(join(tmpdir(), "hour-beeper-uniwind-verify-"))
		cleanupDirs.push(rootDir)

		const registryPath = join(rootDir, "node_modules/uniwind/src/components/index.ts")
		mkdirSync(dirname(registryPath), { recursive: true })
		writeFileSync(
			registryPath,
			`module.exports = {\n    get Clipboard() {\n        return require('react-native').Clipboard\n    },\n}\n`,
		)

		expect(() => verifyUniwindCompat({ cwd: rootDir })).toThrow(/forbidden marker/)
	})
})

function getFixtureSource(filePath: string) {
	switch (filePath) {
		case "node_modules/uniwind/src/components/index.ts":
			return `module.exports = {\n    get SafeAreaView() {\n        return require('./native/SafeAreaView').SafeAreaView\n    },\n    get ProgressBarAndroid() {\n        return require('react-native').ProgressBarAndroid\n    },\n    get Clipboard() {\n        return require('react-native').Clipboard\n    },\n    get InteractionManager() {\n        return require('react-native').InteractionManager\n    },\n    get PushNotificationIOS() {\n        return require('react-native').PushNotificationIOS\n    },\n}\n`
		case "node_modules/uniwind/dist/module/components/index.js":
		case "node_modules/uniwind/dist/common/components/index.js":
			return `module.exports = {\n  get SafeAreaView() {\n    return require("./native/SafeAreaView").SafeAreaView;\n  },\n  get ProgressBarAndroid() {\n    return require("react-native").ProgressBarAndroid;\n  },\n  get Clipboard() {\n    return require("react-native").Clipboard;\n  },\n  get InteractionManager() {\n    return require("react-native").InteractionManager;\n  },\n  get PushNotificationIOS() {\n    return require("react-native").PushNotificationIOS;\n  },\n};\n`
		case "node_modules/uniwind/src/components/native/SafeAreaView.tsx":
		case "node_modules/uniwind/src/components/web/SafeAreaView.tsx":
			return `import { SafeAreaView as RNSafeAreaView, ViewProps } from 'react-native'\nexport const SafeAreaView = copyComponentProperties(RNSafeAreaView, (props: ViewProps) => {\n    return <RNSafeAreaView {...props} />\n})\n`
		case "node_modules/uniwind/dist/module/components/native/SafeAreaView.js":
		case "node_modules/uniwind/dist/module/components/web/SafeAreaView.js":
			return `import { SafeAreaView as RNSafeAreaView } from "react-native";\nexport const SafeAreaView = copyComponentProperties(RNSafeAreaView, (props) => {\n  return RNSafeAreaView(props);\n});\n`
		case "node_modules/uniwind/dist/common/components/native/SafeAreaView.js":
		case "node_modules/uniwind/dist/common/components/web/SafeAreaView.js":
			return `var _reactNative = require("react-native");\nconst SafeAreaView = exports.SafeAreaView = (0, _utils.copyComponentProperties)(_reactNative.SafeAreaView, props => {\n  return (0, _jsxRuntime.jsx)(_reactNative.SafeAreaView, {\n    ...props\n  });\n});\n`
		default:
			throw new Error(`Unhandled fixture file: ${filePath}`)
	}
}
