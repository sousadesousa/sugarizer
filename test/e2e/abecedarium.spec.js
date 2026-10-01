// Abecedarium: learn, play, journal export, fullscreen, tutorial, reopen where it was left
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

const abecedarium = helpers.activities.find(function(activity) {
	return activity.id == "org.olpcfrance.Abecedarium";
});
const url = "/" + abecedarium.directory + "/index.html?aid=abcd-e2e&a=" + abecedarium.id + "&n=" + abecedarium.name;

test.beforeEach(async function({ page }) {
	await helpers.useNoServerMode(page);
});

// Create a user, open the activity (or an instance of the journal) and wait for the home screen
async function open(page, objectId) {
	await helpers.createUser(page, "Reader");
	await page.goto(url + (objectId ? "&o=" + objectId : ""));
	await page.locator("#app_learn").waitFor({state: "visible"});
	// sounds are not the matter of these tests
	await page.evaluate(function() {
		Abcd.sound.play = function(sound) {
			this.current = sound;
			const audio = this;
			setTimeout(function() {
				audio.emit("ended", sound);
			}, 20);
		};
	});
}

// Texts of the entries displayed
function entryTexts(page) {
	return page.locator(".entry .entryText").allInnerTexts();
}

// Open the first collection of the first theme
async function openFirstCollection(page) {
	await page.locator("#app_learn").click();
	await page.locator(".theme").first().click();
	await page.locator(".collection").first().click();
	await page.locator(".entry").first().waitFor({state: "visible"});
}

test("home, credits and instruments", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await expect(page.locator("#app_play")).toBeVisible();
	await expect(page.locator("#png-button")).toBeHidden();

	await page.locator("#app_credit").click();
	await expect(page.locator(".credits-popup")).toContainText("Lionel Laské");
	await page.mouse.click(5, 300);
	await expect(page.locator(".credits-popup")).toHaveCount(0);

	const instrument = await page.locator("#app_instrument").getAttribute("src");
	await page.locator("#app_instrument").click();
	expect(await page.locator("#app_instrument").getAttribute("src")).not.toBe(instrument);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("learn: themes, collections, entries and pages", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await page.locator("#app_learn").click();
	await expect(page.locator(".theme")).toHaveCount(4);
	await expect(page.locator(".itemLetter")).toHaveCount(26);

	await page.locator(".theme").first().click();
	const collections = await page.locator(".collection").count();
	expect(collections).toBeGreaterThan(3);

	await page.locator(".collection").first().click();
	await expect(page.locator(".entry")).toHaveCount(8);
	const first = await entryTexts(page);
	const pages = await page.locator("#learn_pageCount").innerText();
	expect(pages).toMatch(/^1\/\d+$/);
	await expect(page.locator("#learn_prev")).toBeHidden();

	// next page
	await page.locator("#learn_next").click();
	await expect(page.locator("#learn_pageCount")).toHaveText(/^2\//);
	expect(await entryTexts(page)).not.toEqual(first);
	await expect(page.locator("#learn_prev")).toBeVisible();
	await page.locator("#learn_prev").click();
	expect(await entryTexts(page)).toEqual(first);

	// back to the collections, then to the themes
	await page.locator("#learn_back").click();
	await expect(page.locator(".collection")).toHaveCount(collections);
	await page.locator("#learn_back").click();
	await expect(page.locator(".theme")).toHaveCount(4);

	// a letter shows the entries starting with it
	await page.locator(".itemLetter").nth(2).click();
	await expect(page.locator(".entry").first()).toBeVisible();
	for (const text of await entryTexts(page)) {
		expect(text.toLowerCase()[0]).toBe("c");
	}
	await page.locator("#learn_back").click();
	await expect(page.locator(".theme")).toHaveCount(4);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("case and language buttons change the texts", async function({ page }) {
	await open(page);
	await openFirstCollection(page);
	const english = await entryTexts(page);
	expect(english[0]).toBe(english[0].toLowerCase());

	// upper case
	await page.locator("#learn_caseButton img").click();
	expect(await entryTexts(page)).toEqual(english.map(function(text) {
		return text.toUpperCase();
	}));
	// script case: the font changes
	await page.locator("#learn_caseButton img").click();
	await expect(page.locator(".entryText2").first()).toBeVisible();
	await page.locator("#learn_caseButton img").click();
	expect(await entryTexts(page)).toEqual(english);

	// French: the entries start again from the first page, with French texts
	await page.locator("#learn_languageButton img").click();
	await expect(page.locator("#learn_languageButton img")).toHaveAttribute("src", /fr\.png/);
	await expect(page.locator(".entry")).toHaveCount(8);
	await expect.poll(function() {
		return entryTexts(page);
	}).not.toEqual(english);
	await expect(page.locator("#learn_pageCount")).toHaveText(/^1\//);

	// Spanish then English again
	await page.locator("#learn_languageButton img").click();
	await expect(page.locator("#learn_languageButton img")).toHaveAttribute("src", /es\.png/);
	await page.locator("#learn_languageButton img").click();
	await expect(page.locator("#learn_languageButton img")).toHaveAttribute("src", /us\.png/);
	await expect.poll(function() {
		return entryTexts(page);
	}).toEqual(english);
});

test("slideshow plays every entry of the page then stops", async function({ page }) {
	await open(page);
	await openFirstCollection(page);
	await page.evaluate(function() {
		window.played = [];
		const play = Abcd.sound.play;
		Abcd.sound.play = function(sound) {
			window.played.push(sound);
			play.call(this, sound);
		};
	});
	await page.locator("#learn_startSlideshow").click();
	await expect(page.locator("#learn_stopSlideshow")).toBeVisible();
	await expect.poll(function() {
		return page.evaluate(function() {
			return window.played.length;
		});
	}).toBe(8);
	await expect(page.locator("#learn_startSlideshow")).toBeVisible();
});

test("entries are saved in the journal as image and as sound", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await openFirstCollection(page);
	const find = function(mimetype) {
		return page.evaluate(function(mimetype) {
			return require("sugar-web/datastore").find().filter(function(entry) {
				return entry.metadata.mimetype == mimetype;
			}).map(function(entry) {
				return entry.metadata.title;
			});
		}, mimetype);
	};
	await expect(page.locator("#png-button")).toBeVisible();
	const text = (await entryTexts(page))[0];

	await page.locator("#png-button").click();
	await expect(page.locator("#png-button")).toHaveClass(/active/);
	await expect(page.locator(".entrySoundIcon").first()).toHaveAttribute("src", /journal\.svg/);
	await page.locator(".entry").first().click();
	await expect.poll(function() {
		return find("image/png");
	}).toEqual([text + ".png"]);
	// back to the normal mode
	await expect(page.locator("#png-button")).not.toHaveClass(/active/);

	await page.locator("#sound-button").click();
	await expect(page.locator("#sound-button")).toHaveClass(/active/);
	await page.locator(".entry").first().click();
	await expect.poll(function() {
		return find("audio/mpeg");
	}).toEqual([text + ".mp3"]);
	expect(errors.real(), errors.report()).toEqual([]);
});

// Find the text of the entry shown by the picture of the card to find
function answerOfPictureGame(page) {
	return page.evaluate(function() {
		const src = document.querySelector(".entryPlayFrom .entryImage").getAttribute("src");
		const code = src.substring(src.lastIndexOf("/") + 1, src.lastIndexOf("."));
		const entry = Abcd.entries.find(function(entry) {
			return entry.code == code;
		});
		return Abcd.text(entry.text);
	});
}

test("play: wrong answer, right answers and end of the game", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await page.locator("#app_play").click();
	await expect(page.locator(".play-type-button")).toHaveCount(6);
	// picture to text
	await page.locator(".play-type-button").first().click();
	await expect(page.locator("#play_itemCount")).toHaveText("1/4");
	await expect(page.locator(".entryPlayFrom")).toBeVisible();
	await expect(page.locator(".entryPlayTo")).toHaveCount(3);

	// check without answer: wrong, then try again
	await page.locator("#play_check").click();
	await expect(page.locator(".entryPlayWrong")).toHaveCount(1);
	await expect(page.locator(".entryPlayWrong")).toHaveCount(0);
	await expect(page.locator("#play_itemCount")).toHaveText("1/4");

	for (let game = 1; game <= 4; game++) {
		await expect(page.locator("#play_itemCount")).toHaveText(game + "/4");
		const answer = await answerOfPictureGame(page);
		const texts = await page.locator(".entryPlayTo .entryText").allInnerTexts();
		const right = texts.indexOf(answer);
		expect(right, "answer '" + answer + "' among " + texts).toBeGreaterThanOrEqual(0);
		if (game == 1) {
			// a wrong choice first
			const wrong = right == 0 ? 1 : 0;
			await page.locator(".entryPlayTo").nth(wrong).click();
			await expect(page.locator(".entryPlaySelected")).toHaveCount(1);
			await page.locator("#play_check").click();
			await expect(page.locator(".entryPlayWrong")).toHaveCount(1);
			await expect(page.locator(".entryPlayWrong")).toHaveCount(0);
		}
		await page.locator(".entryPlayTo").nth(right).click();
		await page.locator("#play_check").click();
		await expect(page.locator(".entryPlayRight")).toHaveCount(1);
	}

	// end of the game
	await expect(page.locator(".gameFinished")).toBeVisible();
	await expect(page.locator(".gameFinsihed-message")).not.toBeEmpty();
	await page.locator("#play_replay").click();
	await expect(page.locator("#play_itemCount")).toHaveText("1/4");
	await page.locator("#play_back").click();
	await expect(page.locator(".play-type-button")).toHaveCount(6);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("play: games can be limited to a letter or a collection", async function({ page }) {
	await open(page);
	await page.locator("#app_play").click();

	// a letter
	await page.locator("#play_filter").click();
	await expect(page.locator(".filter-popup .theme")).toHaveCount(4);
	await expect(page.locator(".filter-popup .itemLetter")).toHaveCount(26);
	await page.locator(".filter-popup .itemLetter").nth(1).click();
	await expect(page.locator(".filter-popup")).toHaveCount(0);
	await expect(page.locator(".filterLetter")).toBeVisible();
	await page.locator(".play-type-button").first().click();
	await expect(page.locator(".entryPlayFrom")).toBeVisible();
	const answer = await answerOfPictureGame(page);
	expect(answer.toLowerCase()[0]).toBe("b");
	await page.locator("#play_back").click();

	// a collection
	await page.locator("#play_filter").click();
	await page.locator(".filter-popup .theme").first().click();
	await page.locator(".filter-popup .collection").first().click();
	await expect(page.locator(".filterCollection")).toBeVisible();
	await expect(page.locator(".filterLetter")).toHaveCount(0);

	// remove the filter
	await page.locator("#play_filter").click();
	await page.locator(".filter-popup .trashButton").click();
	await expect(page.locator(".filterCollection")).toHaveCount(0);
});

test("fullscreen hides the toolbar and the buttons", async function({ page }) {
	await open(page);
	await openFirstCollection(page);
	await page.locator("#fullscreen-button").click();
	await expect(page.locator("#main-toolbar")).toBeHidden();
	await expect(page.locator("#unfullscreen-button")).toBeVisible();
	await expect(page.locator("#learn_caseButton")).toBeHidden();
	await expect(page.locator("#learn_languageButton")).toBeHidden();
	await page.locator("#unfullscreen-button").click();
	await expect(page.locator("#main-toolbar")).toBeVisible();
	await expect(page.locator("#learn_caseButton")).toBeVisible();
	await expect(page.locator("#unfullscreen-button")).toBeHidden();
});

test("tutorial of the home, learn and play screens", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	const titles = [];
	const tutorial = async function(expected) {
		await page.locator("#help-button").click();
		const title = page.locator(".introjs-tooltip-title");
		await expect(title).toBeVisible();
		await expect(title).not.toBeEmpty();
		titles.push(await title.innerText());
		await expect(page.locator(".introjs-tooltiptext")).toContainText(expected);
		await page.locator(".introjs-skipbutton").click();
		await expect(page.locator(".introjs-tooltip")).toHaveCount(0);
	};
	await tutorial("Abecedarium");
	await page.locator("#app_learn").click();
	await tutorial("explore");
	await page.locator("#learn_home_home").click();
	await page.locator("#app_play").click();
	await tutorial("Play");
	expect(titles.length).toBe(3);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("stop and reopen: the screen, page, language and case come back", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await openFirstCollection(page);
	await page.locator("#learn_next").click();
	await page.locator("#learn_caseButton img").click();
	await page.locator("#learn_languageButton img").click();
	await expect(page.locator("#learn_pageCount")).toHaveText(/^1\//);
	await page.locator("#learn_next").click();
	const texts = await entryTexts(page);

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
	}, abecedarium.id);
	expect(entries.length).toBe(1);

	await page.goto(url + "&o=" + entries[0]);
	await expect(page.locator(".entry")).toHaveCount(8);
	await expect(page.locator("#learn_pageCount")).toHaveText(/^2\//);
	expect(await entryTexts(page)).toEqual(texts);
	await expect(page.locator("#learn_languageButton img")).toHaveAttribute("src", /fr\.png/);
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
	await openFirstCollection(page);
	await page.locator("#learn_back").click();
	await page.locator("#learn_back").click();
	await page.locator("#learn_home_home").click();
	await page.locator("#app_play").click();
	await page.locator(".play-type-button").nth(3).click();
	await page.waitForTimeout(500);
	expect(missing, "files missing in Abecedarium").toEqual([]);
});

test.describe("in French", function() {
	test.use({locale: "fr-FR"});

	test("Abecedarium uses the user's language", async function({ page }) {
		await open(page);
		await openFirstCollection(page);
		await expect(page.locator("#learn_languageButton img")).toHaveAttribute("src", /fr\.png/);
		await page.locator("#help-button").click();
		await expect(page.locator(".introjs-tooltiptext")).toContainText("explorer");
	});
});
