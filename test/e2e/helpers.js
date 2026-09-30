// Shared helpers for end-to-end tests
const fs = require("fs");
const path = require("path");

// Activities shipped with Sugarizer
exports.activities = JSON.parse(fs.readFileSync(path.join(__dirname, "../../activities.json"), "utf8"));

// Errors caused by the test machine having no Internet access, not by Sugarizer
const networkErrors = /net::ERR_|Network Error|Failed to fetch|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|status of 404/;

// Run Sugarizer without server, like the desktop and mobile apps
exports.useNoServerMode = async function(page) {
	await page.route("**/js/constant.js", async function(route) {
		const response = await route.fetch();
		const body = (await response.text()).replace("constant.noServerMode = false;", "constant.noServerMode = true;");
		await route.fulfill({response: response, body: body});
	});
};

// Record uncaught errors and error logs of a page
exports.watchErrors = function(page) {
	const errors = [];
	const failedRequests = [];
	page.on("pageerror", function(error) {
		errors.push(error.message);
		if (process.env.DEBUG_E2E) console.log(error.stack);
	});
	page.on("requestfailed", function(request) {
		failedRequests.push(request.url() + " " + request.failure().errorText);
	});
	page.on("console", function(message) {
		if (message.type() == "error") {
			errors.push(message.text());
		}
	});
	return {
		all: errors,
		failedRequests: failedRequests,
		real: function() {
			return errors.filter(function(error) {
				return !networkErrors.test(error);
			});
		}
	};
};

// Create a user from the first screen and wait for the home view
exports.createUser = async function(page, name) {
	await page.goto("/index.html");
	const skip = page.locator(".introjs-skipbutton");
	await skip.waitFor({state: "visible", timeout: 10000}).catch(function() {});
	if (await skip.isVisible()) {
		await skip.click();
	}
	await page.locator("#firstScreen_newuser").click();
	await page.locator("#firstScreen_name").fill(name);
	for (let i = 0; i < 4 && await page.locator("#firstScreen_next").isVisible(); i++) {
		await page.locator("#firstScreen_next").click();
		await page.waitForTimeout(500);
	}
	await page.locator("#desktop_icon").waitFor({state: "visible", timeout: 20000});
};
