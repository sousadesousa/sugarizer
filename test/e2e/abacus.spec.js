// Abacus: the abacus of a new instance, the abacus of a journal instance
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

const abacus = helpers.activities.find(function(activity) {
	return activity.id == "com.homegrownapps.abacus";
});
const url = "/" + abacus.directory + "/index.html?aid=abacus-e2e&a=" + abacus.id + "&n=" + encodeURIComponent(abacus.name);

const buttons = ["decimal-button", "soroban-button", "suanpan-button", "nepo-button", "hex-button", "binary-button", "schety-button", "fractions-button", "caacupe-button", "rods-button", "custom-button"];

test.beforeEach(async function({ page }) {
	await helpers.useNoServerMode(page);
});

// Open the activity (or an instance of the journal) and wait for the abacus
async function open(page, objectId) {
	await page.goto(url + (objectId ? "&o=" + objectId : ""));
	// the palette shows the abacus in use once the activity is initialized
	await page.waitForFunction(function() {
		const used = document.querySelectorAll("#decimal-button, #soroban-button, #suanpan-button, #nepo-button, #hex-button, #binary-button, #schety-button, #fractions-button, #caacupe-button, #rods-button, #custom-button");
		return Array.prototype.some.call(used, function(button) {
			return button.style.backgroundColor == "rgb(128, 128, 128)";
		});
	});
	await page.locator("#abacus-button").click();
	await expect(page.locator("#decimal-button")).toBeVisible();
}

// The only highlighted abacus button of the palette
async function expectUsed(page, id) {
	await expect(page.locator("#" + id)).toHaveCSS("background-color", "rgb(128, 128, 128)");
	for (const other of buttons) {
		if (other != id) {
			await expect(page.locator("#" + other)).not.toHaveCSS("background-color", "rgb(128, 128, 128)");
		}
	}
}

test("a new instance opens on the Decimal abacus", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await helpers.createUser(page, "Counter");
	await open(page);
	await expectUsed(page, "decimal-button");
	expect(errors.real(), errors.report()).toEqual([]);
});

test("a journal instance keeps its abacus", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await helpers.createUser(page, "Counter");
	await open(page);
	await page.locator("#suanpan-button").click();
	await page.locator("#abacus-button").click();
	await expectUsed(page, "suanpan-button");

	// the instance of the journal
	const objectId = await page.evaluate(function(activityId) {
		const entries = require("sugar-web/datastore").find().filter(function(entry) {
			return entry.metadata.activity == activityId;
		});
		return entries.length == 1 ? entries[0].objectId : null;
	}, abacus.id);
	expect(objectId).not.toBeNull();

	// stop saves the abacus and goes back home
	await page.locator("#stop-button").click();
	await page.waitForURL(function(location) {
		return location.pathname.indexOf("/activities/") == -1;
	});
	// an instance created less than 2 seconds ago is considered as new
	await page.waitForTimeout(2500);

	await open(page, objectId);
	await expectUsed(page, "suanpan-button");
	expect(errors.real(), errors.report()).toEqual([]);
});
