// Every activity opens without JavaScript errors
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

let storageState;

// Activities failing on master, with the reason: the test is expected to fail until they are fixed
const knownFailures = {
	"org.somosazucar.JappyActivity": "a new instance swaps to an undefined CodeMirror document (codeeditor.js check_load)"
};

test.beforeAll(async function({ browser }) {
	// Create a user once, activities read its settings from local storage
	const page = await browser.newPage();
	await helpers.useNoServerMode(page);
	await helpers.createUser(page, "Tester");
	storageState = await page.context().storageState();
	await page.close();
});

for (const activity of helpers.activities) {
	test(activity.name + " (" + activity.id + ")", async function({ browser }) {
		test.fail(!!knownFailures[activity.id], knownFailures[activity.id]);
		const context = await browser.newContext({storageState: storageState});
		const page = await context.newPage();
		await helpers.useNoServerMode(page);
		const errors = helpers.watchErrors(page);
		await page.goto("/" + activity.directory + "/index.html?aid=e2e&a=" + activity.id + "&n=" + encodeURIComponent(activity.name));
		await page.waitForLoadState("load");
		// let the activity initialize
		await page.waitForTimeout(2500);
		if (process.env.DEBUG_E2E) console.log(activity.id, errors.all, errors.failedRequests);
		expect(errors.real()).toEqual([]);
		await context.close();
	});
}
