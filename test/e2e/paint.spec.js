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
	await page.waitForTimeout(1500);
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
	// back to the home screen, not the index.html of the activity
	await page.waitForURL(function(url) {
		return !url.pathname.includes("/activities/");
	});
	await page.locator(".home-icon").first().waitFor({state: "attached", timeout: 20000});
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
		// titles come from the English translations: the page has no default texts
		await expect(page.locator("#pen-button")).toHaveAttribute("title", "Pen", {timeout: 10000});
	});
});

// Every tool of the toolbar, on a new drawing
test.describe("tools", function() {
	test.use({viewport: {width: 1280, height: 800}});

	let errors;
	let box;

	// Count pixels of the canvas: painted (not white or transparent), or of a color
	function pixels(page, color) {
		return page.evaluate(function(color) {
			const canvas = document.getElementById("paint-canvas");
			const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
			let count = 0;
			for (let i = 0; i < data.length; i += 4) {
				if (color ? Math.abs(data[i] - color[0]) < 30 && Math.abs(data[i + 1] - color[1]) < 30 && Math.abs(data[i + 2] - color[2]) < 30 && data[i + 3] > 200
					: data[i + 3] > 0 && (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200)) {
					count++;
				}
			}
			return count;
		}, color);
	}

	// Drag on the canvas, positions relative to the canvas
	async function drag(page, from, to, steps) {
		await page.mouse.move(box.x + from[0], box.y + from[1]);
		await page.mouse.down();
		steps = steps || 10;
		for (let step = 1; step <= steps; step++) {
			await page.mouse.move(box.x + from[0] + (to[0] - from[0]) * step / steps, box.y + from[1] + (to[1] - from[1]) * step / steps);
		}
		await page.mouse.up();
	}

	test.beforeEach(async function({ page }) {
		errors = helpers.watchErrors(page);
		await helpers.createUser(page, "Painter");
		await page.goto("/" + paint.directory + "/index.html?aid=paint-e2e&a=" + paint.id + "&n=" + paint.name);
		await expect(page.locator("#pen-button")).toHaveAttribute("title", "Pen", {timeout: 10000});
		await page.waitForTimeout(500);
		box = await page.locator("#paint-canvas").boundingBox();
	});

	test.afterEach(function() {
		expect(errors.real(), errors.report()).toEqual([]);
	});

	test("pen uses the fill color and the size", async function({ page }) {
		await page.locator("#colors-button-fill").click();
		await page.locator(".palette .colors button").nth(9).click();
		await expect(page.locator("#colors-button-fill")).toHaveCSS("background-color", "rgb(0, 0, 0)");
		await drag(page, [100, 100], [400, 100]);
		const thin = await pixels(page, [0, 0, 0]);
		expect(thin).toBeGreaterThan(1000);

		await page.locator("#undo-button").click();
		await expect.poll(function() { return pixels(page); }).toBe(0);
		await page.locator("#size-button").click();
		await page.locator("#size-button").click();
		await expect(page.locator("#size-button")).toHaveCSS("background-image", /size-3\.svg/);
		await drag(page, [100, 100], [400, 100]);
		expect(await pixels(page, [0, 0, 0])).toBeGreaterThan(thin * 2);
	});

	test("undo and redo", async function({ page }) {
		await expect(page.locator("#undo-button")).toBeDisabled();
		await expect(page.locator("#redo-button")).toBeDisabled();
		await drag(page, [100, 100], [400, 100]);
		const drawn = await pixels(page);
		await drag(page, [100, 200], [400, 200]);
		expect(await pixels(page)).toBeGreaterThan(drawn * 1.5);

		await page.locator("#undo-button").click();
		await expect.poll(function() { return pixels(page); }).toBe(drawn);
		await page.locator("#undo-button").click();
		await expect.poll(function() { return pixels(page); }).toBe(0);
		await expect(page.locator("#undo-button")).toBeDisabled();
		await page.locator("#redo-button").click();
		await page.locator("#redo-button").click();
		await expect.poll(function() { return pixels(page); }).toBeGreaterThan(drawn * 1.5);
		await expect(page.locator("#redo-button")).toBeDisabled();
	});

	test("eraser and clear", async function({ page }) {
		await drag(page, [100, 100], [400, 100]);
		const drawn = await pixels(page);
		await page.locator("#eraser-button").click();
		await expect(page.locator("#eraser-button")).toHaveClass(/active/);
		await expect(page.locator("#pen-button")).not.toHaveClass(/active/);
		await drag(page, [100, 100], [250, 100], 20);
		const erased = await pixels(page);
		expect(erased).toBeLessThan(drawn * 0.7);
		expect(erased).toBeGreaterThan(0);

		await page.locator("#clear-button").click();
		expect(await pixels(page)).toBe(0);
	});

	test("bucket fills an area", async function({ page }) {
		// a closed square, filled inside
		await drag(page, [100, 100], [300, 100]);
		await drag(page, [300, 100], [300, 300]);
		await drag(page, [300, 300], [100, 300]);
		await drag(page, [100, 300], [100, 100]);
		const border = await pixels(page);
		await page.locator("#bucket-button").click();
		await page.mouse.click(box.x + 200, box.y + 200);
		const filled = await pixels(page);
		expect(filled).toBeGreaterThan(border + 30000);
		expect(filled).toBeLessThan(border + 45000);
	});

	test("stamps and text", async function({ page }) {
		await page.locator("#stamps-button").click();
		await page.locator(".palette .stamps button").nth(1).click();
		await page.mouse.click(box.x + 200, box.y + 200);
		await expect.poll(function() { return pixels(page); }).toBeGreaterThan(500);
		const stamp = await pixels(page);
		// a bigger stamp when dragging: the stamp shows up once loaded, drag after that
		await page.mouse.move(box.x + 600, box.y + 200);
		await page.mouse.down();
		await page.locator("body > img").waitFor({state: "attached"});
		for (let step = 1; step <= 10; step++) {
			await page.mouse.move(box.x + 600 + step * 8, box.y + 200);
		}
		await page.mouse.up();
		await expect.poll(function() { return pixels(page); }).toBeGreaterThan(stamp * 3);
		const stamps = await pixels(page);
		await expect(page.locator("#paint-canvas ~ img")).toHaveCount(0);

		await page.locator("#text-button").click();
		await page.locator("#text-input").fill("Hello");
		await page.locator("#text-button").click();
		await expect(page.locator("#text-button")).toHaveClass(/active/);
		await drag(page, [300, 450], [340, 450]);
		expect(await pixels(page)).toBeGreaterThan(stamps + 300);
		await expect(page.locator("body > span")).toHaveCount(0);
	});

	// the selection can be made in any direction
	for (const selection of [["down and right", [80, 80], [220, 170]], ["up and left", [220, 170], [80, 80]]]) {
		test("copy and paste, selecting " + selection[0], async function({ page }) {
			await drag(page, [100, 100], [200, 150]);
			const drawn = await pixels(page);
			await page.locator("#copy-button").click();
			await drag(page, selection[1], selection[2]);
			// copying switches to paste
			await expect(page.locator("#paste-button")).toHaveClass(/active/);
			await drag(page, [500, 300], [600, 350]);
			const pasted = await pixels(page);
			expect(pasted).toBeGreaterThan(drawn * 1.8);
			expect(pasted).toBeLessThan(drawn * 2.2);
		});
	}

	test("filters, drawings and save as image", async function({ page }) {
		const total = await page.evaluate(function() {
			const canvas = document.getElementById("paint-canvas");
			return canvas.width * canvas.height;
		});
		await page.locator("#filters-button").click();
		await page.locator(".palette .filters button").nth(1).click();
		expect(await pixels(page, [0, 0, 0])).toBe(total);
		await page.locator("#filters-button").click();
		await page.locator(".palette .filters button").nth(1).click();
		expect(await pixels(page)).toBe(0);

		await page.locator("#drawings-button").click();
		await page.locator(".palette .drawings button").nth(3).click();
		await expect.poll(function() { return pixels(page); }).toBeGreaterThan(10000);

		await page.locator("#save-image-button").click();
		await expect(page.locator(".humane")).toContainText("Image saved to journal");
		const titles = await page.evaluate(function() {
			return require("sugar-web/datastore").find().filter(function(entry) {
				return entry.metadata.mimetype == "image/png";
			}).map(function(entry) {
				return entry.metadata.title;
			});
		});
		expect(titles).toEqual(["Paint by Painter"]);
	});

	test("help shows the tutorial", async function({ page }) {
		await page.locator("#help-button").click();
		await expect(page.locator(".introjs-tooltip")).toContainText("Paint Activity");
		await page.locator(".introjs-nextbutton").click();
		await expect(page.locator(".introjs-tooltip")).toContainText("Pen color");
	});
});

// SugarL10n.js (copied in several activities) declared `const levels` and then incremented it,
// which threw a TypeError for any timestamp older than one minute
test("SugarL10n converts an old timestamp to an elapsed time string", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await helpers.createUser(page, "Painter");
	await page.goto("/" + paint.directory + "/index.html?aid=paint-l10n&a=" + paint.id + "&n=" + paint.name);
	await page.locator("#paint-canvas").waitFor({state: "visible"});

	const result = await page.evaluate(function() {
		/* global SugarLocalization */
		const component = Object.assign({}, SugarLocalization.data(), SugarLocalization.methods, {
			get: function(key, params) {
				return params ? key + "(" + params.time + ")" : key;
			}
		});
		const now = Date.now();
		return {
			recent: component.localizeTimestamp(now - 5 * 1000),
			minutes: component.localizeTimestamp(now - 5 * 60 * 1000),
			twoLevels: component.localizeTimestamp(now - (2 * 60 * 60 + 3 * 60) * 1000 - 500)
		};
	});
	expect(result.recent).toBe("SecondsAgo");
	expect(result.minutes).toBe("Ago( 5 Minutes_other)");
	expect(result.twoLevels).toBe("Ago( 2 Hours_other, 3 Minutes_other)");
	expect(errors.real(), errors.report()).toEqual([]);
});
