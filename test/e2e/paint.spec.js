// Paint: draw, save to the journal, reopen the drawing
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

const paint = helpers.activities.find(function(activity) {
	return activity.id == "org.olpcfrance.PaintActivity";
});

// Number of pixels of the canvas that are not white or transparent
function paintedPixels(page) {
	return page.evaluate(function() {
		const canvas = document.getElementById("paint-canvas");
		const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
		let count = 0;
		for (let i = 0; i < data.length; i += 4) {
			if (data[i + 3] > 0 && (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200)) {
				count++;
			}
		}
		return count;
	});
}

test.beforeEach(async function({ page }) {
	await helpers.useNoServerMode(page);
});

test("draw, stop and reopen a drawing from the journal", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await helpers.createUser(page, "Painter");

	// new drawing
	await page.goto("/" + paint.directory + "/index.html?aid=paint-e2e&a=" + paint.id + "&n=" + paint.name);
	const canvas = page.locator("#paint-canvas");
	await canvas.waitFor({state: "visible"});
	await page.locator("#stop-button").waitFor({state: "visible"});
	await page.waitForTimeout(1000);
	expect(await paintedPixels(page)).toBe(0);

	// draw three strokes with the pen
	const box = await canvas.boundingBox();
	for (let stroke = 0; stroke < 3; stroke++) {
		const y = box.y + 80 + stroke * 60;
		await page.mouse.move(box.x + 100, y);
		await page.mouse.down();
		for (let step = 1; step <= 20; step++) {
			await page.mouse.move(box.x + 100 + step * 15, y + (step % 2) * 20);
		}
		await page.mouse.up();
	}
	const drawn = await paintedPixels(page);
	expect(drawn).toBeGreaterThan(500);

	// stop saves the drawing in the journal and goes back home
	await page.locator("#stop-button").click();
	await page.waitForURL(/\/index\.html/);
	await expect(page.locator("#desktop_icon")).toBeVisible({timeout: 20000});
	const entries = await page.evaluate(function(activityId) {
		return require("sugar-web/datastore").find().filter(function(entry) {
			return entry.metadata.activity == activityId;
		}).map(function(entry) {
			return entry.objectId;
		});
	}, paint.id);
	expect(entries.length).toBe(1);

	// reopen it from the journal: the same drawing comes back
	await page.goto("/" + paint.directory + "/index.html?aid=paint-e2e&a=" + paint.id + "&o=" + entries[0] + "&n=" + paint.name);
	await canvas.waitFor({state: "visible"});
	await expect.poll(function() {
		return paintedPixels(page);
	}, {timeout: 10000}).toBeGreaterThan(drawn * 0.9);
	expect(await paintedPixels(page)).toBeLessThan(drawn * 1.1);

	expect(errors.real(), errors.report()).toEqual([]);
});

test("palettes open with their content", async function({ page }) {
	const errors = helpers.watchErrors(page);
	const missing = [];
	page.on("response", function(response) {
		// a regional locale file (en-US.json) may not exist: the language one (en.json) is used then
		if (response.status() >= 400 && response.url().indexOf("/activities/") != -1 && !/\/locales\/[a-z]+-[A-Za-z]+\.json$/.test(response.url())) {
			missing.push(response.status() + " " + response.url());
		}
	});
	await helpers.createUser(page, "Painter");
	await page.goto("/" + paint.directory + "/index.html?aid=paint-e2e&a=" + paint.id + "&n=" + paint.name);
	await page.locator("#stop-button").waitFor({state: "visible"});
	await page.waitForTimeout(1000);

	// palettes built from mustache templates, and how many buttons they show at least
	const palettes = {"colors-button-fill": 10, "stamps-button": 5, "text-button": 2, "filters-button": 2};
	let checked = 0;
	for (const button of Object.keys(palettes)) {
		// some tools are not shown on narrow screens
		if (!await page.locator("#" + button).isVisible()) {
			continue;
		}
		checked++;
		await page.locator("#" + button).click();
		const count = await page.evaluate(function() {
			// sugar-web shows an open palette with visibility: visible
			const open = Array.from(document.querySelectorAll(".palette")).filter(function(palette) {
				return palette.style.visibility == "visible";
			});
			return open.length ? open[0].querySelectorAll("button, img, input").length : 0;
		});
		expect(count, button).toBeGreaterThanOrEqual(palettes[button]);
		// close it: the button toggles its palette
		await page.locator("#" + button).click();
	}

	expect(checked).toBeGreaterThanOrEqual(3);
	expect(missing, "files missing in Paint").toEqual([]);
	expect(errors.real(), errors.report()).toEqual([]);
});

test.describe("in French", function() {
	test.use({locale: "fr-FR"});

	test("Paint uses the user's language", async function({ page }) {
		await helpers.createUser(page, "Peintre");
		await page.goto("/" + paint.directory + "/index.html?aid=paint-e2e&a=" + paint.id + "&n=" + paint.name);
		await expect(page.locator("#pen-button")).toHaveAttribute("title", "Mode pinceau", {timeout: 10000});
	});
});

test.describe("in British English", function() {
	test.use({locale: "en-GB"});

	test("a regional locale falls back to its language", async function({ page }) {
		await helpers.createUser(page, "Painter");
		await page.goto("/" + paint.directory + "/index.html?aid=paint-e2e&a=" + paint.id + "&n=" + paint.name);
		// the English translations are loaded, not only the default texts of the page
		await expect.poll(function() {
			return page.evaluate(function() {
				const i18next = require("i18next.min");
				return i18next.language + " " + i18next.hasResourceBundle("en", "translation");
			});
		}, {timeout: 10000}).toBe("en true");
		await expect(page.locator("#pen-button")).toHaveAttribute("title", "Pen");
	});
});
