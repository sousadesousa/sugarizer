// First launch, home screen and journal
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

const paint = helpers.activities.find(function(activity) {
	return activity.id == "org.olpcfrance.PaintActivity";
});

test.beforeEach(async function({ page }) {
	await helpers.useNoServerMode(page);
});

test("create a user and reach the home screen", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await helpers.createUser(page, "Tester");
	// favorite activities are on the home ring (as many as fit on screen)
	expect(await page.locator(".home-icon").count()).toBeGreaterThan(10);
	const settings = await page.evaluate(function() {
		return JSON.parse(window.localStorage.getItem("sugar_settings"));
	});
	expect(settings.name).toBe("Tester");
	expect(errors.real(), errors.report()).toEqual([]);
});

test("open an activity from the home screen, stop it and find it in the journal", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await helpers.createUser(page, "Tester");
	await page.locator("[id='" + paint.id + "']").first().click();
	await page.waitForURL(/Paint\.activity/);
	await page.locator("#stop-button").waitFor({state: "visible", timeout: 20000});
	// the activity attaches its buttons once loaded
	await page.waitForTimeout(1500);
	await page.locator("#stop-button").click();
	// back to the home screen, not the index.html of the activity
	await page.waitForURL(function(url) {
		return !url.pathname.includes("/activities/");
	});
	await page.locator(".home-icon").first().waitFor({state: "attached", timeout: 20000});
	// the activity instance is now in the journal
	const journal = await page.evaluate(function() {
		return require("sugar-web/datastore").find().map(function(entry) {
			return entry.metadata.activity;
		});
	});
	expect(journal).toContain(paint.id);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("the user is remembered after a reload", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await helpers.createUser(page, "Tester");
	await page.reload();
	await page.locator(".home-icon").first().waitFor({state: "attached", timeout: 20000});
	expect(errors.real(), errors.report()).toEqual([]);
});
