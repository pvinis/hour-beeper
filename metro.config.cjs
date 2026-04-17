const { getDefaultConfig } = require("expo/metro-config")
const { withUniwindConfig } = require("uniwind/metro")
const { createHash } = require("node:crypto")
const { readFileSync } = require("node:fs")

const getCacheVersion = (values) =>
	values
		.filter(Boolean)
		.reduce(
			(hash, value) => hash.update("\0", "utf8").update(value || "", "utf8"),
			createHash("md5"),
		)
		.digest("hex")

let config = getDefaultConfig(__dirname)

config.cacheVersion = getCacheVersion([
	config.cacheVersion,
	readFileSync("./package.json", "utf8"),
	readFileSync("./bun.lock", "utf8"),
])

config = withUniwindConfig(config, {
	cssEntryFile: "./global.css",
	dtsFile: "./uniwind-types.d.ts",
})

module.exports = config
