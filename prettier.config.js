/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
	plugins: [
		"prettier-plugin-tailwindcss", // must be last
	],

	semi: false,
	singleQuote: false,
	printWidth: 100,

	tailwindAttributes: ["className", "/.*ClassName/"],
	tailwindFunctions: ["cn", "cva", "useResolveClassNames"],
}
export default config
