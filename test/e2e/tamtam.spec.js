// TamTam Micro: instruments, piano and simon modes, fullscreen, tutorial, reopen the last mode
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

const tamtam = helpers.activities.find(function(activity) {
	return activity.id == "org.olpcfrance.TamTamMicro";
});
const url = "/" + tamtam.directory + "/index.html?aid=tamtam-e2e&a=" + tamtam.id + "&n=" + encodeURIComponent(tamtam.name);

test.beforeEach(async function({ page }) {
	await helpers.useNoServerMode(page);
});

// Create a user, open the activity (or an instance of the journal) and record the notes played
async function open(page, objectId) {
	await helpers.createUser(page, "Musician");
	await page.goto(url + (objectId ? "&o=" + objectId : ""));
	await page.locator("#instruments-button").waitFor({state: "visible"});
	await page.locator(".collection").first().or(page.locator("#app_items .item")).first().waitFor({state: "visible"});
	// the sound is not the matter of these tests: record the pitches played instead
	await page.evaluate(function() {
		window.pitches = [];
		window.loaded = [];
		TamTam.tonePlayer.play = function(pitch) {
			window.pitches.push(pitch);
		};
		TamTam.tonePlayer.load = function(file, callback) {
			window.loaded.push(file);
			if (callback) {
				callback();
			}
		};
	});
}

function pitches(page) {
	return page.evaluate(function() {
		return window.pitches;
	});
}

test("instruments: collections and sounds", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await expect(page.locator("#instruments-button")).toHaveClass(/active/);
	await expect(page.locator(".collection")).toHaveCount(8);
	await expect(page.locator(".item")).toHaveCount(76);

	// a collection shows its sounds
	await page.locator(".collection").nth(1).click();
	await expect(page.locator(".item")).toHaveCount(12);
	await expect(page.locator(".collection img").nth(1)).toHaveAttribute("src", /animalssel\.png/);
	await page.locator(".collection").nth(0).click();
	await expect(page.locator(".item")).toHaveCount(76);

	// a sound is selected and played
	await page.locator("#app_cat img").click();
	await expect(page.locator("#app_cat img")).toHaveAttribute("src", /catsel\.png/);
	await expect(page.locator("#app_piano img")).toHaveAttribute("src", /images\/database\/piano\.png/);
	expect(await page.evaluate(function() {
		return window.loaded;
	})).toContain("audio/database/cat.mp3");
	// another sound takes the selection
	await page.locator("#app_dog img").click();
	await expect(page.locator("#app_dog img")).toHaveAttribute("src", /dogsel\.png/);
	await expect(page.locator("#app_cat img")).toHaveAttribute("src", /images\/database\/cat\.png/);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("piano: keys and keyboard", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await page.locator("#app_cat img").click();
	await page.locator("#piano-button").click();
	await expect(page.locator("#piano-button")).toHaveClass(/active/);
	await expect(page.locator("#instruments-button")).not.toHaveClass(/active/);
	await expect(page.locator("li.standard")).toHaveCount(7);
	await expect(page.locator("li.black")).toHaveCount(6);
	// the sound selected is shown on top
	await expect(page.locator("#app_cat")).toBeVisible();
	expect(await page.evaluate(function() {
		return window.loaded.slice(-1)[0];
	})).toBe("audio/database/cat.mp3");

	await page.evaluate(function() {
		window.pitches = [];
	});
	// C, E and A with the mouse, then F, G sharp... with the keyboard
	await page.locator("li.standard").nth(0).click();
	await page.locator("li.standard").nth(2).click();
	await page.locator("li.standard").nth(5).click();
	await page.locator("li.black").nth(0).click();
	expect(await pitches(page)).toEqual([0, 4, 9, 1]);
	await page.keyboard.press("4");
	await page.keyboard.press("Control+5");
	await page.keyboard.press("8");
	expect(await pitches(page)).toEqual([0, 4, 9, 1, 5, 8]);

	// back to the instruments
	await page.locator("#instruments-button").click();
	await expect(page.locator(".item")).toHaveCount(76);
	// the keyboard doesn't play anymore
	await page.keyboard.press("1");
	expect((await pitches(page)).length).toBe(6);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("simon: levels, score and mistakes", async function({ page }) {
	test.setTimeout(120000);
	const errors = helpers.watchErrors(page);
	await open(page);
	await page.locator("#simon-button").click();
	await expect(page.locator("#simon-button")).toHaveClass(/active/);
	await expect(page.locator("#SimonStart")).toHaveText("START");
	await expect(page.locator("#SimonLevel")).toHaveText("LEVEL : 1");
	await expect(page.locator("#SimonScroe")).toHaveText("SCORE : 0");
	await expect(page.locator("#Red")).toHaveClass(/disableElement/);

	// the colors are chosen randomly: always take the second one (green) so the test can repeat them
	await page.evaluate(function() {
		Math.random = function() {
			return 0.3;
		};
	});
	await page.locator("#SimonStart").click();
	// the colors are playing: the user can't play yet
	await expect(page.locator("#SimonStart")).toHaveText("1");
	await expect(page.locator("#Red")).toHaveClass(/disableElement/);
	await expect(page.locator("#Red")).not.toHaveClass(/disableElement/, {timeout: 10000});
	await expect(page.locator("#SimonStart")).toHaveText("");

	// level 1: repeat the color
	await page.locator("#Green").click();
	await expect(page.locator("#SimonStart")).toHaveText("RIGHT");
	await expect(page.locator("#SimonScroe")).toHaveText("SCORE : 1");
	await expect(page.locator("#SimonLevel")).toHaveText("LEVEL : 2");

	// level 2: two colors, with the keyboard for the first one
	await expect(page.locator("#Red")).not.toHaveClass(/disableElement/, {timeout: 15000});
	await expect(page.locator("#SimonStart")).toHaveText("");
	await page.keyboard.press("ArrowRight");
	await page.locator("#Green").click();
	await expect(page.locator("#SimonScroe")).toHaveText("SCORE : 4");
	await expect(page.locator("#SimonLevel")).toHaveText("LEVEL : 3");

	// level 3: a mistake ends the game
	await expect(page.locator("#Red")).not.toHaveClass(/disableElement/, {timeout: 20000});
	await page.locator("#Red").click();
	await expect(page.locator("#SimonStart")).toHaveText("WRONG");
	await expect(page.locator("#SimonStart")).toHaveClass(/wrongRed/);
	await expect(page.locator("#SimonStart")).toHaveText("PLAY AGAIN", {timeout: 5000});
	await expect(page.locator("#SimonLevel")).toHaveText("LEVEL : 1");
	// the score stays until a new game starts
	await expect(page.locator("#SimonScroe")).toHaveText("SCORE : 4");
	await page.locator("#SimonStart").click();
	await expect(page.locator("#SimonScroe")).toHaveText("SCORE : 0");
	expect(errors.real(), errors.report()).toEqual([]);
});

test("fullscreen hides the toolbar", async function({ page }) {
	await open(page);
	const height = await page.locator("#app_content").evaluate(function(element) {
		return element.offsetHeight;
	});
	await page.locator("#fullscreen-button").click();
	await expect(page.locator("#main-toolbar")).toBeHidden();
	await expect(page.locator("#unfullscreen-button")).toBeVisible();
	await expect.poll(function() {
		return page.locator("#app_content").evaluate(function(element) {
			return element.offsetHeight;
		});
	}).toBeGreaterThan(height);
	await page.locator("#unfullscreen-button").click();
	await expect(page.locator("#main-toolbar")).toBeVisible();
	await expect(page.locator("#unfullscreen-button")).toBeHidden();
});

test("tutorial of the three modes", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	const tutorial = async function(expected) {
		await page.locator("#help-button").click();
		await expect(page.locator(".introjs-tooltip-title")).toBeVisible();
		await expect(page.locator(".introjs-tooltiptext")).toContainText(expected);
		await page.locator(".introjs-skipbutton").click();
		await expect(page.locator(".introjs-tooltip")).toHaveCount(0);
	};
	await tutorial("play instruments");
	await page.locator("#piano-button").click();
	await tutorial("current instrument");
	await page.locator("#simon-button").click();
	await tutorial("current instrument");
	expect(errors.real(), errors.report()).toEqual([]);
});

test("stop and reopen: the mode and the sound come back", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await page.locator("#app_cat img").click();
	await page.locator("#simon-button").click();
	await page.locator("#stop-button").click();
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
	}, tamtam.id);
	expect(entries.length).toBe(1);

	await page.goto(url + "&o=" + entries[0]);
	await expect(page.locator("#simon-button")).toHaveClass(/active/);
	await expect(page.locator("#SimonStart")).toHaveText("START");
	await expect(page.locator("#app_cat")).toBeVisible();
	await page.locator("#piano-button").click();
	await expect(page.locator("#app_cat")).toBeVisible();
	expect(errors.real(), errors.report()).toEqual([]);
});

test("every file of the activity exists", async function({ page }) {
	const missing = [];
	page.on("response", function(response) {
		if (response.status() >= 400 && response.url().indexOf("/activities/") != -1 && !/\/locales\/[a-z]+-[A-Za-z]+\.json$/.test(response.url())) {
			missing.push(response.status() + " " + response.url());
		}
	});
	await open(page);
	for (let i = 0; i < 8; i++) {
		await page.locator(".collection").nth(i).click();
	}
	await page.locator("#piano-button").click();
	await page.locator("#simon-button").click();
	await page.waitForTimeout(500);
	expect(missing, "files missing in TamTam Micro").toEqual([]);
});

test.describe("in French", function() {
	test.use({locale: "fr-FR"});

	test("TamTam Micro uses the user's language", async function({ page }) {
		await open(page);
		await page.locator("#simon-button").click();
		await expect(page.locator("#SimonStart")).toHaveText("JOUER");
	});
});
