// First launch, home view and journal
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

test.beforeEach(async function({ page }) {
	await helpers.useNoServerMode(page);
});

test("create a user and reach the home view", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await helpers.createUser(page, "Tester");
	await expect(page.locator("#desktop_owner")).toBeVisible();
	// favorite activities are on the home ring (as many as fit on screen)
	expect(await page.locator("#desktop_desktop > .web-activity").count()).toBeGreaterThan(10);
	const settings = await page.evaluate(function() {
		return JSON.parse(window.localStorage.getItem("sugar_settings"));
	});
	expect(settings.name).toBe("Tester");
	expect(errors.real()).toEqual([]);
});

test("open an activity, stop it and find it in the journal", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await helpers.createUser(page, "Tester");
	const paint = helpers.activities.find(function(activity) {
		return activity.id == "org.olpcfrance.PaintActivity";
	});
	await page.goto("/" + paint.directory + "/index.html?aid=test&a=" + paint.id + "&n=" + paint.name);
	await page.locator("#stop-button").waitFor({state: "visible", timeout: 20000});
	await page.locator("#stop-button").click();
	await page.waitForURL(/\/index\.html/);
	await expect(page.locator("#desktop_icon")).toBeVisible({timeout: 20000});
	// the activity instance is now in the journal
	const journal = await page.evaluate(function() {
		return require("sugar-web/datastore").find().map(function(entry) {
			return entry.metadata.activity;
		});
	});
	expect(journal).toContain(paint.id);
	expect(errors.real()).toEqual([]);
});
