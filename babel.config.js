/** @param {import('@babel/core').ConfigAPI} api */
function configFn(api) {
	api.cache(true)

	return {
		presets: ["babel-preset-expo"],
		plugins: [
			[
				"module-resolver",
				{
					alias: {
						"@": "./src",
						"@assets": "./assets",
						"@@": ".",
					},
				},
			],
		],
	}
}
export default configFn
