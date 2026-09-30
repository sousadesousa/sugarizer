// Shared helpers for end-to-end tests
const fs = require("fs");
const path = require("path");

// Activities shipped with Sugarizer
exports.activities = JSON.parse(fs.readFileSync(path.join(__dirname, "../../activities.json"), "utf8"));

// Errors caused by the test machine having no Internet access, not by Sugarizer
// (including web sites refusing requests coming from the test server origin)
const networkErrors = /net::ERR_|Network Error|Failed to fetch|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|status of 404|blocked by CORS policy|AxiosError \(HTTP request failed\)/;

// Run Sugarizer without server, like the desktop and mobile apps
exports.useNoServerMode = async function(page) {
	await page.route("**/js/sugarizer.js", async function(route) {
		const response = await route.fetch();
		const body = (await response.text()).replace("noServerMode: false", "noServerMode: true");
		await route.fulfill({response: response, body: body});
	});
};

// Record uncaught errors and error logs of a page
exports.watchErrors = function(page) {
	const errors = [];
	const failedRequests = [];
	page.on("pageerror", function(error) {
		// axios only rejects for HTTP or network failures
		errors.push(error.name == "AxiosError" ? "AxiosError (HTTP request failed): " + error.message : error.message);
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
		},
		// describe errors and failed requests, to explain a failure
		report: function() {
			return "Errors:\n" + errors.join("\n") + "\nFailed requests:\n" + failedRequests.join("\n");
		}
	};
};

// Create a user from the first screen and wait for the home screen
exports.createUser = async function(page, name) {
	await page.goto("/index.html");
	const skip = page.locator(".introjs-skipbutton");
	await skip.waitFor({state: "visible", timeout: 10000}).catch(function() {});
	if (await skip.isVisible()) {
		await skip.click();
	}
	await page.locator("#newuser-icon").click();
	await page.locator("input[name=name]").fill(name);
	// name, color, then Done
	for (let i = 0; i < 4 && !await page.locator(".home-icon").first().isVisible().catch(function() { return false; }); i++) {
		await page.getByText(/^(Next|Done)$/).first().click().catch(function() {});
		await page.waitForTimeout(800);
	}
	await page.locator(".home-icon").first().waitFor({state: "attached", timeout: 20000});
	// the home tutorial is shown on first launch
	await page.waitForTimeout(500);
	const tutorial = page.locator(".introjs-skipbutton");
	if (await tutorial.isVisible()) {
		await tutorial.click();
	}
};
