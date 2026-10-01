// Last One Loses: the board, the computer, levels, the shared game, the journal
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

const lol = helpers.activities.find(function(activity) {
	return activity.id == "org.olpc-france.LOLActivity";
});
const url = "/" + lol.directory + "/index.html?aid=lol-e2e&a=" + lol.id + "&n=" + encodeURIComponent(lol.name);

test.beforeEach(async function({ page }) {
	await helpers.useNoServerMode(page);
});

// Create a user, open the activity (or an instance of the journal) and wait for the board
async function open(page, objectId) {
	await helpers.createUser(page, "Player");
	await page.goto(url + (objectId ? "&o=" + objectId : ""));
	await page.locator(".lol-item").first().waitFor({state: "visible"});
}

// The computer takes the most it can: the games are always the same
async function computerTakesMost(page) {
	await page.evaluate(function() {
		Math.random = function() {
			return 0.99;
		};
	});
}

async function take(page, count) {
	for (let i = 0; i < count; i++) {
		await page.locator(".lol-item").nth(i).click();
	}
	await page.locator("#lOLGameApp_playbutton").click();
}

test("the board: select between one and three items", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await expect(page.locator(".lol-item")).toHaveCount(13);
	await expect(page.locator("#level-easy-button")).toHaveClass(/active/);
	await expect(page.locator("#lOLGameApp_playbutton")).toBeHidden();
	await expect(page.locator("#lOLGameApp_endmessage")).toBeHidden();

	await page.locator(".lol-item").nth(0).click();
	await expect(page.locator("#lOLGameApp_playbutton")).toBeVisible();
	await page.locator(".lol-item").nth(1).click();
	await page.locator(".lol-item").nth(2).click();
	// a fourth item can't be selected
	await page.locator(".lol-item").nth(3).click();
	await expect(page.locator(".lol-item-selected")).toHaveCount(3);
	// selected items have the other color of the user
	const colors = await page.evaluate(function() {
		const items = document.querySelectorAll(".lol-item");
		return {selected: items[0].style.backgroundColor, other: items[5].style.backgroundColor};
	});
	expect(colors.selected).not.toBe(colors.other);

	// click again to unselect, no item: no play button
	await page.locator(".lol-item").nth(0).click();
	await page.locator(".lol-item").nth(1).click();
	await page.locator(".lol-item").nth(2).click();
	await expect(page.locator(".lol-item-selected")).toHaveCount(0);
	await expect(page.locator("#lOLGameApp_playbutton")).toBeHidden();
	expect(errors.real(), errors.report()).toEqual([]);
});

test("a game against the computer: I win", async function({ page }) {
	test.setTimeout(60000);
	const errors = helpers.watchErrors(page);
	await open(page);
	await computerTakesMost(page);
	await expect(page.locator("#lOLGameApp_player")).not.toHaveClass(/empty-image/);
	await expect(page.locator("#lOLGameApp_computer")).toHaveClass(/empty-image/);

	// 13: I take 3, the computer takes 3 (7), I take 2 (5), the computer takes 3 (2), I take 1, the computer has to take the last one
	await take(page, 3);
	await expect(page.locator("#lOLGameApp_player")).toHaveClass(/empty-image/);
	await expect(page.locator("#lOLGameApp_computer")).not.toHaveClass(/empty-image/);
	await expect(page.locator(".lol-item")).toHaveCount(7, {timeout: 5000});
	await expect(page.locator("#lOLGameApp_player")).not.toHaveClass(/empty-image/);
	await take(page, 2);
	await expect(page.locator(".lol-item")).toHaveCount(2, {timeout: 5000});
	await take(page, 1);
	await expect(page.locator("#lOLGameApp_endmessage")).toBeVisible({timeout: 5000});
	await expect(page.locator("#lOLGameApp_endmessage")).toHaveClass(/end-message-win/);
	await expect(page.locator(".lol-item")).toHaveCount(0);
	// nobody plays anymore
	await expect(page.locator("#lOLGameApp_player")).toHaveClass(/empty-image/);
	await expect(page.locator("#lOLGameApp_computer")).toHaveClass(/empty-image/);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("a game against the computer: I lose", async function({ page }) {
	test.setTimeout(60000);
	await open(page);
	await computerTakesMost(page);
	// I take the last item
	await take(page, 3);
	await expect(page.locator(".lol-item")).toHaveCount(7, {timeout: 5000});
	await take(page, 3);
	await expect(page.locator(".lol-item")).toHaveCount(1, {timeout: 5000});
	await take(page, 1);
	await expect(page.locator("#lOLGameApp_endmessage")).toBeVisible();
	await expect(page.locator("#lOLGameApp_endmessage")).toHaveClass(/end-message-lost/);

	// a new game starts again with 13 items
	await page.locator("#new-game-button").click();
	await expect(page.locator(".lol-item")).toHaveCount(13);
	await expect(page.locator("#lOLGameApp_endmessage")).toBeHidden();
});

test("levels: the computer is more clever", async function({ page }) {
	await open(page);
	const result = await page.evaluate(function() {
		const think = function(length, level) {
			const game = new LOLGame(length);
			return game.think(level);
		};
		const out = {};
		// level 1 leaves one item at the end
		out.easy = [2, 3, 4].map(function(length) { return think(length, 1); });
		// level 2 leaves five
		out.medium = [6, 7, 8].map(function(length) { return think(length, 2); });
		// level 3 leaves the nearest multiple of 4 plus 1: 9, 5, 1
		out.hard = [10, 11, 12, 7, 6].map(function(length) {
			const shot = think(length, 3);
			return length - shot;
		});
		// a shot is always between 1 and 3 and never more than the items left except the last one
		out.always = true;
		for (let level = 1; level <= 3; level++) {
			for (let length = 1; length <= 13; length++) {
				for (let i = 0; i < 20; i++) {
					const shot = think(length, level);
					if (shot < 1 || shot > 3 || (length > 1 && shot > length - 1)) {
						out.always = false;
					}
				}
			}
		}
		// rules of the game
		const game = new LOLGame(5);
		out.badShots = [game.play(0), game.play(4), game.play(undefined), game.getPlayer()];
		out.afterPlay = [game.play(3), game.getPlayer()];
		out.end = [game.play(2), game.endOfGame(), game.getPlayer()];
		return out;
	});
	expect(result.easy).toEqual([1, 2, 3]);
	expect(result.medium).toEqual([1, 2, 3]);
	expect(result.hard).toEqual([9, 9, 9, 5, 5]);
	expect(result.always).toBe(true);
	expect(result.badShots).toEqual([5, 5, 5, 0]);
	expect(result.afterPlay).toEqual([2, 1]);
	expect(result.end).toEqual([0, true, 1]);

	// the level buttons
	await page.locator("#level-medium-button").click();
	await expect(page.locator("#level-medium-button")).toHaveClass(/active/);
	await expect(page.locator("#level-easy-button")).not.toHaveClass(/active/);
	await page.locator("#level-hard-button").click();
	await expect(page.locator("#level-hard-button")).toHaveClass(/active/);
	await expect(page.locator("#level-medium-button")).not.toHaveClass(/active/);
});

test("switch player: the computer begins", async function({ page }) {
	await open(page);
	await computerTakesMost(page);
	await expect(page.locator("#switch-player-button")).toBeEnabled();
	await page.locator("#switch-player-button").click();
	// the computer plays first, at the start of a game only
	await expect(page.locator(".lol-item")).toHaveCount(10, {timeout: 5000});
	await expect(page.locator("#switch-player-button")).toBeDisabled();
	await expect(page.locator("#lOLGameApp_player")).not.toHaveClass(/empty-image/);
	await page.locator("#new-game-button").click();
	await expect(page.locator(".lol-item")).toHaveCount(13);
	await expect(page.locator("#switch-player-button")).toBeEnabled();
});

// The user as the sharing palette gives it, and a fake network
async function fakeNetwork(page) {
	await page.evaluate(function() {
		window.sent = [];
		window.handlers = {};
		const network = {
			createSharedActivity: function(name, callback) {
				callback("group-1");
			},
			onDataReceived: function(handler) {
				window.handlers.data = handler;
			},
			onSharedActivityUserChanged: function(handler) {
				window.handlers.users = handler;
			},
			listSharedActivityUsers: function(id, callback) {
				callback([]);
			},
			getUserInfo: function() {
				return {networkId: "me", name: "Me", colorvalue: {stroke: "#005FE4", fill: "#FF2B34"}};
			},
			getSharedInfo: function() {
				return {id: "group-1"};
			},
			sendMessage: function(id, message) {
				window.sent.push(message);
			}
		};
		LOL.app.activity.getPresenceObject = function(callback) {
			callback(null, network);
			return network;
		};
		window.closeCount = 0;
		LOL.app.activity.close = function() {
			window.closeCount++;
		};
	});
}

const guest = {networkId: "guest-1", name: "Guest", colorvalue: {stroke: "#00EA11", fill: "#FF8F00"}};

test("shared game: the host", async function({ page }) {
	test.setTimeout(60000);
	const errors = helpers.watchErrors(page);
	await open(page);
	await fakeNetwork(page);
	await page.evaluate(function() {
		LOL.app.onShared(null, {popDown: function() {}});
	});
	// levels are for the computer only
	await expect(page.locator("#level-easy-button")).toBeDisabled();
	await expect(page.locator("#level-easy-button")).not.toHaveClass(/active/);
	await expect(page.locator("#level-hard-button")).toHaveAttribute("title", "Not available in multiplayer");
	await expect(page.locator("#new-game-button")).toBeEnabled();

	// a user joins: the host starts the game for him
	await page.evaluate(function(user) {
		window.handlers.users({move: 1, user: user});
	}, guest);
	await expect(page.locator(".humane")).toContainText("Guest joined");
	let sent = await page.evaluate(function() {
		return window.sent;
	});
	expect(sent.map(function(message) { return message.action + ":" + message.content; })).toEqual(["init:13"]);

	// a third user is asked to leave
	await page.evaluate(function() {
		window.handlers.users({move: 1, user: {networkId: "third", name: "Third", colorvalue: {stroke: "#000000", fill: "#FFFFFF"}}});
	});
	sent = await page.evaluate(function() {
		return window.sent.slice(1);
	});
	expect(sent).toEqual([expect.objectContaining({action: "exit", content: "third"})]);

	// the host plays two items, the guest is told; the guest plays three, the board follows
	await take(page, 2);
	sent = await page.evaluate(function() {
		return window.sent.slice(2);
	});
	expect(sent).toEqual([expect.objectContaining({action: "update", content: 2})]);
	await expect(page.locator(".lol-item")).toHaveCount(11);
	await expect(page.locator("#lOLGameApp_computer")).toHaveClass(/oponent-image/);
	await page.evaluate(function(user) {
		window.handlers.data({user: user, action: "update", content: 3});
	}, guest);
	await expect(page.locator(".lol-item")).toHaveCount(8, {timeout: 3000});
	await expect(page.locator("#lOLGameApp_player")).not.toHaveClass(/empty-image/);

	// messages of the user himself are ignored
	await page.evaluate(function() {
		window.handlers.data({user: {networkId: "me"}, action: "update", content: 1});
	});
	await page.waitForTimeout(700);
	await expect(page.locator(".lol-item")).toHaveCount(8);

	// a new game is sent to the guest
	await page.locator("#new-game-button").click();
	await expect(page.locator(".lol-item")).toHaveCount(13);
	expect(await page.evaluate(function() {
		return window.sent.slice(-1)[0].action;
	})).toBe("init");

	// the guest leaves: the host plays alone again
	await page.evaluate(function(user) {
		window.handlers.users({move: 0, user: user});
	}, guest);
	await expect(page.locator(".humane")).toContainText("Guest left");
	expect(errors.real(), errors.report()).toEqual([]);
});

test("shared game: the guest", async function({ page }) {
	test.setTimeout(60000);
	const errors = helpers.watchErrors(page);
	await open(page);
	await fakeNetwork(page);
	const host = {networkId: "host-1", name: "Host", colorvalue: {stroke: "#8E00FF", fill: "#FF8F00"}};
	await page.evaluate(function() {
		// the guest joined a shared instance
		LOL.app.shared = true;
		LOL.app.presence = LOL.app.activity.getPresenceObject(function(error, network) {
			network.onDataReceived(LOL.app.onNetworkDataReceived);
			network.onSharedActivityUserChanged(LOL.app.onNetworkUserChanged);
		});
	});
	await expect(page.locator("#new-game-button")).toBeDisabled();
	await expect(page.locator("#new-game-button")).toHaveAttribute("title", "Only Host can do it");
	await expect(page.locator("#switch-player-button")).toBeDisabled();

	// the host starts: the guest plays second, the host plays 3 items
	await page.evaluate(function(user) {
		window.handlers.data({user: user, action: "init", content: 13});
	}, host);
	await expect(page.locator(".lol-item")).toHaveCount(13);
	await expect(page.locator("#lOLGameApp_computer")).toHaveClass(/oponent-image/);
	await expect(page.locator("#lOLGameApp_player")).toHaveClass(/empty-image/);
	// the guest can't play before his turn
	await page.locator(".lol-item").nth(0).click();
	await expect(page.locator(".lol-item-selected")).toHaveCount(0);
	await page.evaluate(function(user) {
		window.handlers.data({user: user, action: "update", content: 3});
	}, host);
	await expect(page.locator(".lol-item")).toHaveCount(10, {timeout: 3000});
	await expect(page.locator("#lOLGameApp_player")).not.toHaveClass(/empty-image/);
	await take(page, 1);
	expect(await page.evaluate(function() {
		return window.sent.slice(-1)[0];
	})).toEqual(expect.objectContaining({action: "update", content: 1}));

	// a new game, then the host switches the players: the guest begins
	await page.evaluate(function(user) {
		window.handlers.data({user: user, action: "init", content: 13});
	}, host);
	await expect(page.locator(".lol-item")).toHaveCount(13);
	await expect(page.locator("#lOLGameApp_player")).toHaveClass(/empty-image/);
	await page.evaluate(function(user) {
		window.handlers.data({user: user, action: "update", content: 0});
	}, host);
	await expect(page.locator("#lOLGameApp_player")).not.toHaveClass(/empty-image/);

	// the host takes the last items: the guest wins
	await page.evaluate(function(user) {
		window.handlers.data({user: user, action: "init", content: 3});
	}, host);
	await page.evaluate(function(user) {
		window.handlers.data({user: user, action: "update", content: 3});
	}, host);
	await expect(page.locator("#lOLGameApp_endmessage")).toBeVisible({timeout: 3000});
	await expect(page.locator("#lOLGameApp_endmessage")).toHaveClass(/end-message-win/);

	// a third player is asked to leave
	await page.evaluate(function(user) {
		window.handlers.data({user: user, action: "exit", content: "someone else"});
	}, host);
	expect(await page.evaluate(function() {
		return window.closeCount;
	})).toBe(0);
	await page.evaluate(function(user) {
		window.handlers.data({user: user, action: "exit", content: "me"});
	}, host);
	expect(await page.evaluate(function() {
		return window.closeCount;
	})).toBe(1);
	expect(errors.real(), errors.report()).toEqual([]);
});

// Create a saved game in the journal and return its id
function saveGame(page, game) {
	return page.evaluate(function(args) {
		return new Promise(function(resolve) {
			require("sugar-web/datastore").create({
				activity: args.id, mimetype: "text/plain", title: "Last One Loses",
				timestamp: new Date().getTime(), creation_time: new Date().getTime(), file_size: 0
			}, function(error, objectId) {
				resolve(objectId);
			}, JSON.stringify(args.game));
		});
	}, {id: lol.id, game: game});
}

test("the game is saved in the journal at each move and comes back", async function({ page }) {
	test.setTimeout(60000);
	const errors = helpers.watchErrors(page);
	await open(page);
	await computerTakesMost(page);
	await page.locator("#level-hard-button").click();
	await take(page, 2);
	await expect(page.locator(".lol-item")).toHaveCount(9, {timeout: 5000});
	// the move of the computer is saved too: the items left, the level
	const saved = await page.evaluate(function(activityId) {
		const datastore = require("sugar-web/datastore");
		return datastore.find().filter(function(entry) {
			return entry.metadata.activity == activityId;
		}).length;
	}, lol.id);
	expect(saved).toBe(1);

	// a game in the journal starts again with the items left and the level
	await page.goto(url + "&o=" + await saveGame(page, {size: 13, count: 6, level: 2, player: 1}));
	await expect(page.locator(".lol-item")).toHaveCount(6);
	await expect(page.locator("#level-medium-button")).toHaveClass(/active/);
	await expect(page.locator("#level-easy-button")).not.toHaveClass(/active/);
	// the user plays first, the new game has all the items again
	await expect(page.locator("#lOLGameApp_player")).not.toHaveClass(/empty-image/);
	await page.locator("#new-game-button").click();
	await expect(page.locator(".lol-item")).toHaveCount(13);
	await expect(page.locator("#level-medium-button")).toHaveClass(/active/);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("fullscreen hides the toolbar", async function({ page }) {
	await open(page);
	await page.locator("#fullscreen-button").click();
	await expect(page.locator("#main-toolbar")).toBeHidden();
	await expect(page.locator("#unfullscreen-button")).toBeVisible();
	await expect(page.locator("#lOLGameApp_box")).toHaveCSS("margin-top", "-30px");
	await page.locator("#unfullscreen-button").click();
	await expect(page.locator("#main-toolbar")).toBeVisible();
	await expect(page.locator("#unfullscreen-button")).toBeHidden();
});

test("tutorial", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await open(page);
	await page.locator("#help-button").click();
	await expect(page.locator(".introjs-tooltip-title")).toBeVisible();
	await expect(page.locator(".introjs-tooltiptext")).toContainText("Last One Loses");
	// every step has an element: the board, buttons, levels, network
	await page.locator(".introjs-nextbutton").click();
	await expect(page.locator(".introjs-tooltiptext")).toContainText("13 items");
	await page.locator(".introjs-skipbutton").click();
	await expect(page.locator(".introjs-tooltip")).toHaveCount(0);
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
	await computerTakesMost(page);
	await take(page, 3);
	await expect(page.locator(".lol-item")).toHaveCount(7, {timeout: 5000});
	await page.waitForTimeout(500);
	expect(missing, "files missing in Last One Loses").toEqual([]);
});

test.describe("in French", function() {
	test.use({locale: "fr-FR"});

	test("Last One Loses uses the user's language", async function({ page }) {
		await open(page);
		await fakeNetwork(page);
		await page.evaluate(function() {
			LOL.app.onShared(null, {popDown: function() {}});
		});
		await page.evaluate(function(user) {
			window.handlers.users({move: 1, user: user});
		}, guest);
		await expect(page.locator(".humane")).toContainText("Guest a rejoint");
	});
});
