// Tank Operation: missions, play with the LCD keyboard, rules of the game, journal, tutorial
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

const tankop = helpers.activities.find(function(activity) {
	return activity.id == "org.olpcfrance.TankOp";
});
const url = "/" + tankop.directory + "/index.html?aid=tk-e2e&a=" + tankop.id + "&n=" + encodeURIComponent(tankop.name);

test.beforeEach(async function({ page }) {
	await helpers.useNoServerMode(page);
});

// Create a user, open the activity (or an instance of the journal) and wait for the home screen
async function open(page, objectId) {
	await helpers.createUser(page, "Gunner");
	await page.goto(url + (objectId ? "&o=" + objectId : ""));
	await page.locator(".start-button-text").waitFor({state: "visible"});
	await expect(page.locator(".mission-text")).not.toHaveText("");
	// the sounds are not the matter of these tests: record them
	await page.evaluate(function() {
		window.sounds = [];
		TankOp.sound.play = function(sound) {
			window.sounds.push(sound);
		};
		TankOp.sound.pause = function() {};
	});
}

function status(page) {
	return page.evaluate(function() {
		return {
			wave: document.getElementById("play_wave").innerText,
			score: document.getElementById("play_score").innerText
		};
	});
}

// Digits displayed on the LCD display
function lcd(page) {
	return page.locator(".lcd-num").evaluateAll(function(digits) {
		return digits.map(function(digit) {
			const match = /lcd-image-(\w+)/.exec(digit.className);
			return match ? match[1] : "";
		}).join(",");
	});
}

test("home: missions, credits and completed missions", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await expect(page.locator(".mission")).toHaveCount(12);
	await expect(page.locator(".mission-completed")).toHaveCount(0);
	await expect(page.locator(".mission-text")).toHaveText("TYPE NUMBER");
	await expect(page.locator(".start-button-text")).toHaveText("START");

	// the arrows go through the 12 missions, back to the first one
	await page.locator(".go-right").click();
	await expect(page.locator(".mission-text")).toHaveText("ADDITION 1 TO 3");
	await page.locator(".go-left").click();
	await page.locator(".go-left").click();
	await expect(page.locator(".mission-text")).toHaveText("ADDITION AND SUBTRACTION");
	for (let i = 0; i < 12; i++) {
		await page.locator(".go-right").click();
	}
	await expect(page.locator(".mission-text")).toHaveText("ADDITION AND SUBTRACTION");
	await page.locator(".go-right").click();
	await expect(page.locator(".mission-text")).toHaveText("TYPE NUMBER");

	// credits, closed with a click outside
	await page.locator("#app_credit").click();
	await expect(page.locator(".credits-popup")).toContainText("Lionel Laské");
	await expect(page.locator(".credits-popup")).toContainText("Tux4kids");
	await page.mouse.click(20, 600);
	await expect(page.locator(".credits-popup")).toHaveCount(0);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("play: LCD display and keyboard", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await page.locator(".start-button-text").click();
	await expect(page.locator("#acanvas")).toBeVisible();
	expect(await status(page)).toEqual({wave: "0001", score: "0000"});
	expect(await lcd(page)).toBe("empty,empty,empty");

	// virtual keys and keyboard
	await page.locator("#play_key_3").click();
	await page.locator("#play_key_6").click();
	expect(await lcd(page)).toBe("empty,3,6");
	await page.keyboard.press("9");
	expect(await lcd(page)).toBe("3,6,9");
	await page.keyboard.press("0");
	expect(await lcd(page)).toBe("6,9,0");
	// dash then digits for a negative result
	await page.keyboard.press("-");
	expect(await lcd(page)).toBe("empty,empty,dash");
	await page.keyboard.press("4");
	expect(await lcd(page)).toBe("empty,dash,4");

	// fire with a result no enemy has: missed, the display is cleared
	await page.locator("#play_key_fire").click();
	expect(await lcd(page)).toBe("empty,empty,empty");
	expect(await page.evaluate(function() {
		return window.sounds;
	})).toContain("audio/missed");
	await page.keyboard.press("5");
	await page.keyboard.press(" ");
	expect(await lcd(page)).toBe("empty,empty,empty");

	// home goes back to the missions
	await page.locator("#play_home").click();
	await expect(page.locator(".start-button-text")).toBeVisible();
	await expect(page.locator(".mission-completed")).toHaveCount(0);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("play: win a mission by giving the results", async function({ page }) {
	test.setTimeout(90000);
	const errors = helpers.watchErrors(page);
	await open(page);
	// a short mission: three enemies, all with the result 5, arriving fast
	await page.evaluate(function() {
		TankOp.levels[0].attack = 3;
		TankOp.levels[0].generator = function() {
			return {tag: "2+3", result: 5};
		};
		constant.startArrival = 1;
		constant.loopInterval = 100;
	});
	await page.locator(".start-button-text").click();
	await expect(page.locator("#acanvas")).toBeVisible();

	// fire the result until the mission is won
	await expect.poll(async function() {
		if (!(await page.evaluate(function() {
			return window.sounds.indexOf("audio/mission_completed") != -1;
		}))) {
			await page.keyboard.press("5");
			await page.keyboard.press(" ");
		}
		return page.evaluate(function() {
			return window.sounds.indexOf("audio/mission_completed") != -1;
		});
	}, {timeout: 60000, intervals: [300]}).toBe(true);
	const result = await status(page);
	expect(parseInt(result.score)).toBeGreaterThanOrEqual(3);
	expect(result.wave).not.toBe("0000");

	// a click ends the mission: it is completed and the next one is selected
	await page.locator("#acanvas").click();
	await expect(page.locator(".start-button-text")).toBeVisible();
	await expect(page.locator(".mission-completed")).toHaveCount(1);
	await expect(page.locator(".mission-text")).toHaveText("ADDITION 1 TO 3");
	expect(errors.real(), errors.report()).toEqual([]);
});

test("play: the target moves with clicks around the center", async function({ page }) {
	await open(page);
	await page.locator(".start-button-text").click();
	await expect(page.locator("#acanvas")).toBeVisible();
	await page.waitForTimeout(700);
	const hash = function() {
		return page.evaluate(function() {
			const canvas = document.getElementById("acanvas");
			const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
			// pixels of the target only: the target is drawn in a 64 pixels tile, look at its tile column
			let hash = 0;
			for (let i = 0; i < data.length; i += 13) {
				hash = (hash * 31 + data[i]) | 0;
			}
			return hash;
		});
	};
	// a click far on the right of the center moves the target on the right
	const before = await hash();
	const viewport = page.viewportSize();
	await page.mouse.click(viewport.width / 2 + 300, viewport.height / 2 - 50);
	await page.waitForTimeout(700);
	expect(await hash()).not.toBe(before);
	// a click on the center fires on the target: no error
	await page.mouse.click(viewport.width / 2, (viewport.height + 100) / 2);
});

test("rules: units, fights and waves", async function({ page }) {
	await open(page);
	const result = await page.evaluate(function() {
		const out = {};
		const sounds = [];
		const explosions = [];
		const game = new TankOp.Game(0, {
			explode: function(unit) {
				explosions.push(unit);
			},
			sound: function(sound) {
				sounds.push(sound);
			}
		});

		// mission 1: 4 HQ and 4 tanks around them, the target in the middle
		const types = game.units.map(function(unit) {
			return TankOp.Game.unitTypes[game.getUnitType(unit)];
		});
		out.hq = types.filter(function(type) { return type == "hq"; }).length;
		out.tanks = types.filter(function(type) { return type == "tank"; }).length;
		out.target = {x: game.targetpos.x, y: game.targetpos.y};
		out.mapRows = game.game.length;
		out.mapColumns = game.game[0].length;

		// who could beat who: soldier beats helo, a tank doesn't beat a canon
		const make = function(type, color, x, y) {
			return game.createUnit({type: type, color: color, x: x, y: y, engine: null});
		};
		const soldier = make("soldier", "blue", 5, 5);
		const helo = make("helo", "red", 9, 5);
		const tank = make("tank", "blue", 6, 6);
		const canon = make("canon", "red", 10, 6);
		out.soldierHelo = game.couldBeat(soldier, helo);
		out.tankCanon = game.couldBeat(tank, canon);
		out.canonTank = game.couldBeat(canon, tank);

		// a fight takes one power, the user takes ten
		const enemy = make("tank", "red", 12, 7);
		enemy.value = {tag: "1+1", result: 2};
		game.units.push(enemy);
		game.processFight(tank, enemy);
		out.powerAfterFight = enemy.power;
		game.fire("3");
		out.missed = sounds.slice();
		game.fire("2");
		out.powerAfterFire = enemy.power;
		out.explosions = explosions.length;
		out.targetOnEnemy = {x: game.targetpos.x, y: game.targetpos.y, enemyX: enemy.x, enemyY: enemy.y};

		// the target stays in the board
		game.targetpos = {x: 14, y: 0};
		game.moveTarget(1, 0);
		game.moveTarget(0, -1);
		out.targetCorner = {x: game.targetpos.x, y: game.targetpos.y};
		game.moveTarget(-1, 1);
		out.targetMoved = {x: game.targetpos.x, y: game.targetpos.y};

		// a dead unit is removed and gives points at the next tick
		const before = game.score;
		game.tick();
		out.removedEnemy = game.units.indexOf(enemy) == -1;
		out.scoreGain = game.score - before;
		return out;
	});
	expect(result.hq).toBe(4);
	expect(result.tanks).toBe(4);
	expect(result.target).toEqual({x: 7, y: 4});
	expect(result.mapRows).toBe(9);
	expect(result.mapColumns).toBe(15);
	expect(result.soldierHelo).toBe(true);
	expect(result.tankCanon).toBe(false);
	expect(result.canonTank).toBe(true);
	expect(result.powerAfterFight).toBe(1);
	expect(result.missed).toEqual(["audio/missed"]);
	expect(result.powerAfterFire).toBeLessThanOrEqual(0);
	expect(result.explosions).toBe(2);
	expect(result.targetOnEnemy).toEqual({x: 12, y: 7, enemyX: 12, enemyY: 7});
	expect(result.targetCorner).toEqual({x: 14, y: 0});
	expect(result.targetMoved).toEqual({x: 13, y: 1});
	expect(result.removedEnemy).toBe(true);
	expect(result.scoreGain).toBe(2);
});

test("rules: enemies walk to the HQ, the end of a mission", async function({ page }) {
	await open(page);
	const result = await page.evaluate(function() {
		const out = {};
		const game = new TankOp.Game(0, {});
		const hqs = game.units.filter(function(unit) {
			return game.getUnitType(unit) == 0;
		});

		// an enemy far on the right comes closer to the HQ at each tick
		game.enemyCount = 1;
		game.units = hqs.slice();
		const enemy = game.createUnit({type: "soldier", color: "red", x: 14, y: 4, engine: function(unit, hqs) {
			game.badEngine(unit, hqs);
		}});
		enemy.value = {tag: "0", result: 0};
		game.units.push(enemy);
		const start = enemy.x + enemy.y;
		for (let i = 0; i < 4; i++) {
			game.tick();
		}
		out.distanceBefore = Math.abs(start - 4);
		out.moved = Math.abs(enemy.x - 14) + Math.abs(enemy.y - 4) > 0;
		out.ended = game.endOfGame;

		// no more HQ: defeat
		hqs.forEach(function(hq) {
			hq.power = 0;
		});
		game.tick();
		out.defeat = {endOfGame: game.endOfGame, win: game.win};

		// no more enemy and none to come: victory
		const winning = new TankOp.Game(1, {});
		winning.enemyCount = 0;
		winning.units = winning.units.filter(function(unit) {
			return unit.getCurrentImage().indexOf("blue") != -1;
		});
		winning.tick();
		out.victory = {endOfGame: winning.endOfGame, win: winning.win};

		// each mission can be started
		out.missions = TankOp.levels.map(function(level, i) {
			const game = new TankOp.Game(i, {});
			const value = level.generator();
			return game.units.length > 0 && typeof value.tag == "string" && typeof value.result == "number";
		});
		return out;
	});
	expect(result.moved).toBe(true);
	expect(result.ended).toBe(false);
	expect(result.defeat).toEqual({endOfGame: true, win: false});
	expect(result.victory).toEqual({endOfGame: true, win: true});
	expect(result.missions.every(Boolean)).toBe(true);
	expect(result.missions.length).toBe(12);
});

test("operations of the missions give the right result", async function({ page }) {
	await open(page);
	const wrong = await page.evaluate(function() {
		const failures = [];
		TankOp.levels.forEach(function(level) {
			for (let i = 0; i < 200; i++) {
				const value = level.generator();
				const match = /^(\d+)([+-])(\d+)$/.exec(value.tag);
				const missing = /^(\d+)\+\?=(\d+)$/.exec(value.tag);
				let expected;
				if (match) {
					expected = match[2] == "+" ? parseInt(match[1]) + parseInt(match[3]) : parseInt(match[1]) - parseInt(match[3]);
				} else if (missing) {
					expected = parseInt(missing[2]) - parseInt(missing[1]);
				} else {
					expected = parseInt(value.tag);
				}
				if (expected !== value.result) {
					failures.push(level.id + " " + value.tag + " " + value.result);
				}
				// results are small enough for the 3 digits of the display, subtractions never negative
				if (Math.abs(value.result) > 99 || (/S0|STW|AAS/.test(level.id) && value.result < 0)) {
					failures.push(level.id + " out of range " + value.tag);
				}
			}
		});
		return failures;
	});
	expect(wrong).toEqual([]);
});

// Create a saved game in the journal and return its id
function saveGame(page, states) {
	return page.evaluate(function(args) {
		return new Promise(function(resolve) {
			require("sugar-web/datastore").create({
				activity: args.id, mimetype: "text/plain", title: "Tank Operation",
				timestamp: new Date().getTime(), creation_time: new Date().getTime(), file_size: 0
			}, function(error, objectId) {
				resolve(objectId);
			}, JSON.stringify(args.states));
		});
	}, {id: tankop.id, states: states});
}

test("completed missions are saved in the journal and come back", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	const states = [true, false, true, true, false, false, false, false, false, false, false, false];
	await page.goto(url + "&o=" + await saveGame(page, states));
	await expect(page.locator(".mission")).toHaveCount(12);
	await expect(page.locator(".mission-completed")).toHaveCount(3);
	await expect(page.locator(".mission").nth(2)).toHaveClass(/mission-completed/);
	await expect(page.locator(".mission").nth(1)).toHaveClass(/mission-tocomplete/);

	// stop saves them again, with the score in the metadata
	await page.locator("#stop-button").click();
	await page.waitForURL(function(url) {
		return !url.pathname.includes("/activities/");
	});
	await page.locator(".home-icon").first().waitFor({state: "attached", timeout: 20000});
	const saved = await page.evaluate(function(activityId) {
		return require("sugar-web/datastore").find().filter(function(entry) {
			return entry.metadata.activity == activityId;
		}).map(function(entry) {
			return entry.metadata.score;
		});
	}, tankop.id);
	expect(saved).toContain("3/12");
	expect(errors.real(), errors.report()).toEqual([]);
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

test("tutorial of the home and of the play screen", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	const tutorial = async function(expected) {
		await page.locator("#help-button").click();
		await expect(page.locator(".introjs-tooltip-title")).toBeVisible();
		await expect(page.locator(".introjs-tooltiptext")).toContainText(expected);
		await page.locator(".introjs-skipbutton").click();
		await expect(page.locator(".introjs-tooltip")).toHaveCount(0);
	};
	await tutorial("Tank Operation");
	await page.locator(".start-button-text").click();
	await expect(page.locator("#acanvas")).toBeVisible();
	await tutorial("Destroy each wave");
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
	await page.locator("#app_credit").click();
	await page.mouse.click(20, 600);
	await page.locator(".start-button-text").click();
	await expect(page.locator("#acanvas")).toBeVisible();
	await page.waitForTimeout(1500);
	expect(missing, "files missing in Tank Operation").toEqual([]);
});

test.describe("in French", function() {
	test.use({locale: "fr-FR"});

	test("Tank Operation uses the user's language", async function({ page }) {
		await open(page);
		await expect(page.locator(".start-button-text")).toHaveText("DEMARRER");
	});
});
