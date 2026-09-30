// The web version keeps working offline once used, thanks to sw.js
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

test("home and an opened activity load offline", async function({ browser }) {
	const context = await browser.newContext();
	// switch to no-server mode for requests from the page and from the service worker
	await context.route("**/js/constant.js", async function(route) {
		const response = await route.fetch();
		const body = (await response.text()).replace("constant.noServerMode = false;", "constant.noServerMode = true;");
		await route.fulfill({response: response, body: body});
	});
	const page = await context.newPage();
	const errors = helpers.watchErrors(page);

	// register the service worker (?sw=1: it is off on localhost by default)
	await page.goto("/index.html?sw=1");
	await page.evaluate(async function() {
		await navigator.serviceWorker.ready;
	});
	await page.reload();
	expect(await page.evaluate(function() {
		return !!navigator.serviceWorker.controller;
	})).toBe(true);

	await helpers.createUser(page, "Tester");
	const paint = helpers.activities.find(function(activity) {
		return activity.id == "org.olpcfrance.PaintActivity";
	});
	const paintUrl = "/" + paint.directory + "/index.html?aid=offline&a=" + paint.id + "&n=" + paint.name;
	await page.goto(paintUrl);
	await page.locator("#stop-button").waitFor({state: "visible", timeout: 20000});
	// let background refreshes finish filling the cache
	await page.waitForTimeout(2000);

	await context.setOffline(true);
	await page.goto("/index.html");
	await expect(page.locator("#desktop_icon")).toBeVisible({timeout: 20000});
	await page.goto(paintUrl);
	await expect(page.locator("#stop-button")).toBeVisible({timeout: 20000});

	// server API is never answered from the cache
	const api = await page.evaluate(function() {
		return fetch("/api").then(function() {
			return "answered";
		}, function() {
			return "failed";
		});
	});
	expect(api).toBe("failed");
	expect(errors.real(), errors.report()).toEqual([]);
	await context.close();
});
