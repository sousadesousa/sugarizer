// ESLint configuration: Sugarizer's own code, not vendored libraries or activities
const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
	{
		// only lint the files listed below
		ignores: ["activities/**", "docs/**", "res/**", "lib/*", "lib/*/**", "test/*.js", "cordova.js", "Gruntfile.js", "!lib/activities.js", "!lib/autosync.js", "!lib/history.js", "!lib/l10n.js", "!lib/server.js", "!lib/settings.js", "!lib/stats.js", "!lib/tutorial.js", "!lib/util.js"]
	},
	{
		files: ["js/**/*.js", "lib/activities.js", "lib/autosync.js", "lib/history.js", "lib/l10n.js", "lib/server.js", "lib/settings.js", "lib/stats.js", "lib/tutorial.js", "lib/util.js"],
		languageOptions: {
			ecmaVersion: 2018,
			sourceType: "script",
			globals: {
				...globals.browser,
				...globals.amd,
				enyo: "readonly", l10n: "writable", util: "writable", preferences: "writable", datastore: "writable",
				constant: "writable", app: "writable", myserver: "writable", tutorial: "writable", stats: "writable",
				iconLib: "writable", xoPalette: "writable", radioButtonsGroup: "writable", humane: "writable", toolbar: "writable",
				historic: "writable", activities: "writable", presence: "writable", autosync: "writable",
				cordova: "readonly", sugarizerOS: "writable", chrome: "readonly", Keyboard: "readonly", Media: "readonly",
				module: "writable", require: "readonly", process: "readonly", ActiveXObject: "readonly",
				mainCanvas: "writable", Intro: "readonly", introJs: "readonly", i18next: "readonly", axios: "readonly",
				FileSaver: "readonly", LocalFileSystem: "readonly", FileTransfer: "readonly",
				SugarizerOSLauncher: "readonly", QRScanner: "readonly", StatusBar: "readonly", Hammer: "readonly",
				Sugar: "writable", mouse: "writable", requirejs: "readonly", AndroidFullScreen: "readonly", isFirstLaunch: "writable"
			}
		},
		rules: {
			...js.configs.recommended.rules,
			// existing style debt, reported without failing the build
			"no-unused-vars": "warn",
			"no-redeclare": "warn",
			"no-empty": "warn",
			"no-useless-escape": "warn",
			"no-prototype-builtins": "warn",
			"no-cond-assign": "warn",
			"no-fallthrough": "warn"
		}
	},
	{
		files: ["main.js", "preload.js", "eslint.config.js", "playwright.config.js"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "commonjs",
			globals: { ...globals.node }
		},
		rules: {
			...js.configs.recommended.rules,
			"no-unused-vars": "warn",
			"no-redeclare": "warn"
		}
	},
	{
		// tests run in Node.js and pass functions to the browser
		files: ["test/e2e/**/*.js"],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: "commonjs",
			globals: { ...globals.node, ...globals.browser }
		},
		rules: {
			...js.configs.recommended.rules
		}
	},
	{
		files: ["sw.js"],
		languageOptions: {
			ecmaVersion: 2018,
			sourceType: "script",
			globals: { ...globals.serviceworker }
		},
		rules: {
			...js.configs.recommended.rules
		}
	}
];
