// End-to-end tests of the web version, see test/e2e
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
	testDir: "test/e2e",
	timeout: 60000,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [["list"], ["html", {open: "never"}]] : "list",
	use: {
		baseURL: "http://127.0.0.1:8765",
		viewport: {width: 1024, height: 700},
		launchOptions: {
			// use a Chromium already on the machine when CHROMIUM_PATH is set
			executablePath: process.env.CHROMIUM_PATH || undefined
		}
	},
	webServer: {
		command: "node test/e2e/server.js",
		url: "http://127.0.0.1:8765/index.html",
		reuseExistingServer: !process.env.CI
	}
});
