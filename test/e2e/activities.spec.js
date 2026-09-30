// Every activity opens without JavaScript errors
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

let storageState;

// Activities failing on 2.0, with the reason: the test is expected to fail until they are fixed
const knownFailures = {
	"org.somosazucar.JappyActivity": "a new instance throws \"Cannot read properties of undefined (reading 'split')\" while initializing (not investigated)"
};

// Errors that happen now and then in third-party code of an activity, ignored for that activity only
const knownIntermittentErrors = {
	// virtualsky.min.js sometimes draws before its constellation data is loaded
	"org.sugarlabs.Constellation": /reading 'And'/
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
		const ignored = knownIntermittentErrors[activity.id];
		const real = errors.real().filter(function(error) {
			return !(ignored && ignored.test(error));
		});
		expect(real, errors.report()).toEqual([]);
		await context.close();
	});
}
