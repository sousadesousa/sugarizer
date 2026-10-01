// FoodChain: home, learn, build and play games, languages, tutorial, reopen the game
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

const foodchain = helpers.activities.find(function(activity) {
	return activity.id == "org.olpcfrance.FoodChain";
});
const url = "/" + foodchain.directory + "/index.html?aid=fc-e2e&a=" + foodchain.id + "&n=" + encodeURIComponent(foodchain.name);

test.beforeEach(async function({ page }) {
	await helpers.useNoServerMode(page);
});

// Create a user, open the activity (or an instance of the journal) and wait for the home screen
async function open(page, objectId) {
	await helpers.createUser(page, "Learner");
	await page.goto(url + (objectId ? "&o=" + objectId : ""));
	await page.locator("#app_LearnGame_button").waitFor({state: "visible"});
	// the sounds are not the matter of these tests: they end at once
	await page.evaluate(function() {
		window.sounds = [];
		FoodChain.sound.play = function(sound) {
			window.sounds.push(sound);
			const audio = this;
			// the result of a game stays displayed a little while
			setTimeout(function() {
				audio.emit(sound);
			}, /applause|disappointed/.test(sound) ? 500 : 30);
		};
		FoodChain.sound.pause = function() {};
	});
}

// Strategy (0 herbivore, 1 carnivore, 2 omnivore) of the card shown in the start box
function strategyOfCard(page) {
	return page.evaluate(function() {
		const src = document.querySelector("#learnGame_card .cardImage").getAttribute("src");
		const name = src.substring(src.lastIndexOf("/") + 1, src.lastIndexOf("."));
		return FoodChain.feedStrategy.findIndex(function(strategy) {
			return strategy.members.indexOf(name) != -1;
		});
	});
}

function score(page) {
	return page.locator(".score-value").innerText().then(function(text) {
		return parseInt(text);
	});
}

test("home: games, descriptions and credits", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await expect(page.locator("#en-button")).toHaveClass(/active/);
	await expect(page.locator("#app_BuildGame_button")).toBeVisible();
	await expect(page.locator("#app_PlayGame_button")).toBeVisible();
	// the cards fall one after the other
	await expect.poll(function() {
		return page.locator(".cardbox .card").count();
	}, {timeout: 10000}).toBeGreaterThan(1);

	// the description of a game is shown when the pointer is over its button
	await expect(page.locator(".game-popup")).toBeHidden();
	await page.locator("#app_LearnGame_button").hover();
	await expect(page.locator(".game-popup")).toContainText("Learn:");
	await expect(page.locator(".game-popup")).toContainText("Put cards in the correct boxes");
	await page.locator("#app_PlayGame_button").hover();
	await expect(page.locator(".game-popup")).toContainText("eat and avoid being eaten");
	await page.mouse.move(5, 300);
	await expect(page.locator(".game-popup")).toBeHidden();

	await page.locator("#app_shadowButton_button").click();
	await expect(page.locator(".credits-popup")).toContainText("Lionel Laské");
	await expect(page.locator(".emul-canvas")).toBeVisible();
	await page.locator("#credits_home_button").click();
	await expect(page.locator("#app_LearnGame_button")).toBeVisible();
	expect(errors.real(), errors.report()).toEqual([]);
});

test("languages: texts and sounds change", async function({ page }) {
	await open(page);
	await page.locator("#fr-button").click();
	await expect(page.locator("#fr-button")).toHaveClass(/active/);
	await expect(page.locator("#en-button")).not.toHaveClass(/active/);
	await page.locator("#app_LearnGame_button").hover();
	await expect(page.locator(".game-popup")).toContainText("Apprendre:");
	await page.locator("#pt_BR-button").click();
	await expect(page.locator("#pt_BR-button")).toHaveClass(/active/);
	await page.locator("#app_LearnGame_button").hover();
	await expect(page.locator(".game-popup")).not.toContainText("Learn:");

	// cards are said in the language
	await page.locator("#fr-button").click();
	await page.locator("#app_LearnGame_button").click();
	await expect(page.locator("#learnGame_card")).toBeVisible();
	expect(await page.evaluate(function() {
		return window.sounds.filter(function(sound) {
			return sound.indexOf("/cards/") != -1;
		})[0];
	})).toContain("audio/fr/cards/");
	await expect(page.locator("#learnGame_herbbox .box-name")).toHaveText("Herbivore");
	await page.locator("#en-button").click();
	await expect(page.locator("#learnGame_carnbox .box-name")).toHaveText("Carnivore");
});

test("learn: sort the cards, with clicks and with drag and drop", async function({ page }) {
	test.setTimeout(120000);
	const errors = helpers.watchErrors(page);
	await open(page);
	await page.locator("#app_LearnGame_button").click();
	await expect(page.locator("#learnGame_card")).toBeVisible();
	await expect(page.locator(".level-value").nth(1)).toHaveText("1");
	await expect(page.locator("#learnGame_omnibox")).toBeHidden();
	expect(await score(page)).toBe(0);
	// the timer starts when the sound of the first card ends
	await expect(page.locator(".timer-value")).not.toHaveText("0:00,0");

	// a card in a wrong box comes back
	let strategy = await strategyOfCard(page);
	const wrong = strategy == 0 ? "#learnGame_carnbox" : "#learnGame_herbbox";
	await page.locator("#learnGame_card").click();
	await expect(page.locator("#learnGame_card")).toHaveClass(/card-dragged/);
	await page.locator(wrong).click();
	await expect(page.locator(wrong)).toHaveClass(/box-lost/);
	await expect(page.locator(wrong)).not.toHaveClass(/box-lost/);
	await expect(page.locator("#learnGame_startbox #learnGame_card")).toBeVisible();
	expect(await score(page)).toBe(0);

	// five cards in the right boxes, the last ones with drag and drop
	const boxes = ["#learnGame_herbbox", "#learnGame_carnbox"];
	for (let i = 0; i < 5; i++) {
		strategy = await strategyOfCard(page);
		if (i < 3) {
			await page.locator("#learnGame_card").click();
			await page.locator(boxes[strategy]).click();
		} else {
			await page.locator("#learnGame_card").dragTo(page.locator(boxes[strategy]));
		}
		if (i < 3) {
			await expect(page.locator(boxes[strategy])).toHaveClass(/box-win/);
		}
		// the last card adds the time left to its point
		if (i < 4) {
			await expect.poll(function() {
				return score(page);
			}).toBe(i + 1);
			await expect(page.locator("#learnGame_startbox #learnGame_card")).toBeVisible();
		}
	}

	// end of the level: the time left is added to the score, home and next level are offered
	await expect(page.locator("#learnGame_forward_button")).toBeVisible();
	await expect(page.locator("#learnGame_home_button")).toBeVisible();
	expect(await score(page)).toBeGreaterThanOrEqual(5);
	expect(await score(page)).toBeLessThanOrEqual(15);
	await page.locator("#learnGame_forward_button").click();
	await expect(page.locator(".level-value").nth(1)).toHaveText("2");
	await expect(page.locator("#learnGame_card")).toBeVisible();

	// pause hides the card, play shows it again
	await page.locator("#learnGame_pause_button").click();
	await expect(page.locator("#learnGame_card")).toBeHidden();
	await expect(page.locator("#learnGame_play_button")).toBeVisible();
	const time = await page.locator(".timer-value").innerText();
	await page.waitForTimeout(600);
	expect(await page.locator(".timer-value").innerText()).toBe(time);
	await page.locator("#learnGame_play_button").click();
	await expect(page.locator("#learnGame_card")).toBeVisible();
	expect(errors.real(), errors.report()).toEqual([]);
});

// Create a saved game in the journal and return its id
function saveGame(page, context) {
	return page.evaluate(function(args) {
		return new Promise(function(resolve) {
			require("sugar-web/datastore").create({
				activity: args.id, mimetype: "text/plain", title: "FoodChain",
				timestamp: new Date().getTime(), creation_time: new Date().getTime(), file_size: 0
			}, function(error, objectId) {
				resolve(objectId);
			}, JSON.stringify(args.context));
		});
	}, {id: foodchain.id, context: context});
}

test("a saved game starts at its level: level 4 has three boxes", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	const objectId = await saveGame(page, {score: 42, game: "FoodChain.LearnGame", level: 4, language: "en"});
	await page.goto(url + "&o=" + objectId);
	await expect(page.locator("#learnGame_card")).toBeVisible();
	await expect(page.locator(".level-value").nth(1)).toHaveText("4");
	await expect(page.locator(".score-value")).toHaveText("0042");
	await expect(page.locator("#learnGame_herbbox")).toBeVisible();
	await expect(page.locator("#learnGame_carnbox")).toBeVisible();
	await expect(page.locator("#learnGame_omnibox")).toBeVisible();
	await expect(page.locator("#learnGame_omnibox .box-name")).toHaveText("Omnivore");

	// the build and play games too
	await page.goto(url + "&o=" + await saveGame(page, {score: 0, game: "FoodChain.BuildGame", level: 5, language: "en"}));
	await expect(page.locator(".level-value").nth(1)).toHaveText("5");
	await expect(page.locator("#buildGame_gamebox .card")).toHaveCount(4);
	await page.goto(url + "&o=" + await saveGame(page, {score: 0, game: "FoodChain.PlayGame", level: 6, language: "en"}));
	await expect(page.locator(".level-value").nth(1)).toHaveText("6");
	await expect(page.locator("#acanvas")).toBeVisible();
	expect(errors.real(), errors.report()).toEqual([]);
});

// The build game always uses the same chain, mixed in reverse
async function fixedChain(page) {
	await page.evaluate(function() {
		FoodChain.randomChain = function(size) {
			return ["fox", "duck", "frog", "snail", "grass"].slice(0, size);
		};
		FoodChain.mix = function(chain) {
			return chain.slice().reverse();
		};
	});
}

test("build: put the cards in order", async function({ page }) {
	test.setTimeout(90000);
	const errors = helpers.watchErrors(page);
	await open(page);
	await fixedChain(page);
	await page.locator("#app_BuildGame_button").click();
	// cards come one after the other, the timer starts at the end
	await expect(page.locator("#buildGame_gamebox .card")).toHaveCount(2);
	await expect(page.locator("#buildGame_gamebox .card:visible")).toHaveCount(2, {timeout: 5000});
	await expect(page.locator(".timer-value")).not.toHaveText("0:00,0");
	// mixed in reverse: duck, fox
	const names = function() {
		return page.locator("#buildGame_gamebox .card:visible").evaluateAll(function(cards) {
			return cards.sort(function(a, b) {
				return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
			}).map(function(card) {
				return card.querySelector(".cardText").innerText;
			});
		});
	};
	expect(await names()).toEqual(["Duck", "Fox"]);

	// validate in the wrong order
	await page.locator("#buildGame_validate_button").click();
	await expect(page.locator("#buildGame_gamebox")).toHaveClass(/box-lost/);
	await expect(page.locator("#buildGame_restart_button")).toBeVisible();
	await expect(page.locator("#buildGame_forward_button")).toBeHidden();
	expect(await score(page)).toBe(0);

	// restart, swap the cards by selecting them, validate
	await page.locator("#buildGame_restart_button").click();
	await expect(page.locator("#buildGame_gamebox")).not.toHaveClass(/box-lost/);
	await expect(page.locator("#buildGame_gamebox .card:visible")).toHaveCount(2, {timeout: 5000});
	await expect(page.locator(".timer-value")).not.toHaveText("0:00,0");
	await page.locator("#buildGame_gamebox .card").nth(0).click();
	await expect(page.locator("#buildGame_gamebox .card").nth(0)).toHaveClass(/card-dragged/);
	await page.locator("#buildGame_gamebox .card").nth(1).click();
	expect(await names()).toEqual(["Fox", "Duck"]);
	await page.locator("#buildGame_validate_button").click();
	await expect(page.locator("#buildGame_gamebox")).toHaveClass(/box-win/);
	expect(await score(page)).toBeGreaterThanOrEqual(10);
	await expect(page.locator("#buildGame_forward_button")).toBeVisible();

	// level 2: three cards, move one with drag and drop
	await page.locator("#buildGame_forward_button").click();
	await expect(page.locator(".level-value").nth(1)).toHaveText("2");
	await expect(page.locator("#buildGame_gamebox .card:visible")).toHaveCount(3, {timeout: 8000});
	await expect(page.locator(".timer-value")).not.toHaveText("0:00,0");
	// mixed: frog, duck, fox => move fox to the left of the board
	expect(await names()).toEqual(["Frog", "Duck", "Fox"]);
	const box = await page.locator("#buildGame_gamebox").boundingBox();
	const fox = page.locator("#buildGame_gamebox .card:visible", {hasText: "Fox"});
	await fox.dragTo(page.locator("#buildGame_gamebox"), {targetPosition: {x: 5, y: 40}});
	expect(await names()).toEqual(["Fox", "Frog", "Duck"]);
	expect(box.width).toBeGreaterThan(500);
	expect(errors.real(), errors.report()).toEqual([]);
});

// Hash of the canvas: changes when something moves
function canvasHash(page) {
	return page.evaluate(function() {
		const canvas = document.getElementById("acanvas");
		const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
		let hash = 0;
		for (let i = 0; i < data.length; i += 7) {
			hash = (hash * 31 + data[i + 3] + data[i]) | 0;
		}
		return hash;
	});
}

test("play: move the frog, pause and sprites", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await page.locator("#app_PlayGame_button").click();
	const canvas = page.locator("#acanvas");
	await canvas.waitFor({state: "visible"});
	await expect(page.locator(".life")).toHaveCount(3);
	await expect(page.locator("#playGame_pause_button")).toBeVisible();
	await expect(page.locator("#playGame_forward_button")).toBeHidden();
	await expect(page.locator(".timer-value")).not.toHaveText("0:00,0");

	// a key turns the frog then moves it
	let before = await canvasHash(page);
	await page.keyboard.press("ArrowUp");
	await page.waitForTimeout(200);
	const turned = await canvasHash(page);
	expect(turned).not.toBe(before);
	await page.keyboard.press("ArrowUp");
	await page.waitForTimeout(600);
	expect(await canvasHash(page)).not.toBe(turned);

	// a click shows the direction to the frog
	before = await canvasHash(page);
	const box = await canvas.boundingBox();
	await page.mouse.click(box.x + box.width - 20, box.y + box.height / 2);
	await page.waitForTimeout(200);
	expect(await canvasHash(page)).not.toBe(before);

	// pause stops the timer, home goes back
	await page.locator("#playGame_pause_button").click();
	await expect(page.locator("#playGame_play_button")).toBeVisible();
	const time = await page.locator(".timer-value").innerText();
	await page.waitForTimeout(500);
	expect(await page.locator(".timer-value").innerText()).toBe(time);
	await page.locator("#playGame_play_button").click();
	await expect(page.locator("#playGame_pause_button")).toBeVisible();
	await page.locator("#playGame_pause_button").click();
	await page.locator("#playGame_home_button").click();
	await expect(page.locator("#app_LearnGame_button")).toBeVisible();
	expect(errors.real(), errors.report()).toEqual([]);
});

test("play: sprites collide", async function({ page }) {
	await open(page);
	const result = await page.evaluate(function() {
		const a = new FoodChain.Sprite({x: 100, y: 100, width: 100, height: 100, heading: 0});
		const near = new FoodChain.Sprite({x: 150, y: 100, width: 100, height: 100, heading: 0});
		const far = new FoodChain.Sprite({x: 400, y: 400, width: 100, height: 100, heading: 0});
		const rect = a.computeRect();
		return {near: a.intersect(near), far: a.intersect(far), width: Math.round(rect.dx), height: Math.round(rect.dy)};
	});
	expect(result).toEqual({near: true, far: false, width: 100, height: 100});
});

test("fullscreen hides the toolbar", async function({ page }) {
	await open(page);
	await page.locator("#fullscreen-button").click();
	await expect(page.locator("#main-toolbar")).toBeHidden();
	await expect(page.locator("#unfullscreen-button")).toBeVisible();
	await page.locator("#unfullscreen-button").click();
	await expect(page.locator("#main-toolbar")).toBeVisible();
	await expect(page.locator("#unfullscreen-button")).toBeHidden();
});

test("tutorial of the home and of each game", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	const tutorial = async function(expected) {
		await page.locator("#help-button").click();
		await expect(page.locator(".introjs-tooltip-title")).toBeVisible();
		await expect(page.locator(".introjs-tooltiptext")).toContainText(expected);
		await page.locator(".introjs-skipbutton").click();
		await expect(page.locator(".introjs-tooltip")).toHaveCount(0);
	};
	await tutorial("pedagogical game");
	await page.locator("#app_LearnGame_button").click();
	await expect(page.locator("#learnGame_card")).toBeVisible();
	await tutorial("drag the animal");
	await page.locator("#learnGame_pause_button").click();
	await page.locator("#learnGame_home_button").click();
	await page.locator("#app_BuildGame_button").click();
	await expect(page.locator("#buildGame_gamebox")).toBeVisible();
	await tutorial("sort the animals");
	await page.locator("#buildGame_pause_button").click();
	await page.locator("#buildGame_home_button").click();
	await page.locator("#app_PlayGame_button").click();
	await expect(page.locator("#acanvas")).toBeVisible();
	await tutorial("steer the frog");
	expect(errors.real(), errors.report()).toEqual([]);
});

test("stop and reopen: the game, level, score and language come back", async function({ page }) {
	test.setTimeout(90000);
	const errors = helpers.watchErrors(page);
	await open(page);
	await page.locator("#fr-button").click();
	await page.locator("#app_LearnGame_button").click();
	await expect(page.locator("#learnGame_card")).toBeVisible();
	// two cards right
	const boxes = ["#learnGame_herbbox", "#learnGame_carnbox"];
	for (let i = 0; i < 2; i++) {
		const strategy = await strategyOfCard(page);
		await page.locator("#learnGame_card").click();
		await page.locator(boxes[strategy]).click();
		await expect(page.locator(boxes[strategy])).toHaveClass(/box-win/);
		await expect(page.locator(boxes[strategy])).not.toHaveClass(/box-win/);
	}
	await expect.poll(function() {
		return score(page);
	}).toBe(2);

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
	}, foodchain.id);
	expect(entries.length).toBe(1);

	await page.goto(url + "&o=" + entries[0]);
	await expect(page.locator("#learnGame_card")).toBeVisible();
	await expect(page.locator("#fr-button")).toHaveClass(/active/);
	await expect(page.locator("#learnGame_herbbox .box-name")).toHaveText("Herbivore");
	expect(await score(page)).toBe(2);
	await expect(page.locator(".level-value").nth(0)).toHaveText("Niveau");
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
	await page.locator("#pt_BR-button").click();
	await page.locator("#app_shadowButton_button").click();
	await page.locator("#credits_home_button").click();
	for (const game of ["Learn", "Build", "Play"]) {
		await page.locator("#app_" + game + "Game_button").click();
		await page.waitForTimeout(800);
		await page.locator("#" + game.toLowerCase() + "Game_pause_button").click();
		await page.locator("#" + game.toLowerCase() + "Game_home_button").click();
	}
	await page.waitForTimeout(500);
	expect(missing, "files missing in FoodChain").toEqual([]);
});

test.describe("in French", function() {
	test.use({locale: "fr-FR"});

	test("FoodChain uses the user's language", async function({ page }) {
		await open(page);
		await expect(page.locator("#fr-button")).toHaveClass(/active/);
		await page.locator("#app_LearnGame_button").hover();
		await expect(page.locator(".game-popup")).toContainText("Apprendre:");
	});
});
