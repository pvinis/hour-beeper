import { withDangerousMod, ConfigPlugin } from "expo/config-plugins"
import fs from "fs"
import path from "path"

const withXcodeEnv: ConfigPlugin = (config) => {
	return withDangerousMod(config, [
		"ios",
		async (cfg) => {
			const iosPath = cfg.modRequest.platformProjectRoot
			const envPath = path.join(iosPath, ".xcode.env")

			const content = `eval "$(/opt/homebrew/bin/mise activate --shims)" # load mise paths\nexport NODE_BINARY=$(command -v node)\n`

			fs.writeFileSync(envPath, content)
			return cfg
		},
	])
}

export default withXcodeEnv
