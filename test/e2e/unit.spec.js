// Run the mocha tests of test/index.html in the browser
const { test, expect } = require("@playwright/test");

test("datastore unit tests", async function({ page }) {
	// presence tests need a running Sugarizer Server, run them by hand
	await page.goto("/test/index.html?grep=Datastore");
	await page.waitForFunction(function() {
		return window.mochaResults !== undefined;
	}, null, {timeout: 30000});
	const results = await page.evaluate(function() {
		return window.mochaResults;
	});
	expect(results.failures, JSON.stringify(results.failed)).toBe(0);
	expect(results.passes).toBeGreaterThan(0);
});
