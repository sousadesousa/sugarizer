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
	// the first screen starts its tutorial only when there is no history of users yet, decided when the screen is created
	const newInstall = await page.evaluate(function() {
		return !Object.keys(localStorage).some(function(key) {
			return key.indexOf("sugar_history") != -1;
		});
	});
	const skip = page.locator(".introjs-skipbutton");
	if (newInstall) {
		await skip.click({timeout: 20000});
		await skip.waitFor({state: "hidden", timeout: 10000});
	}
	await page.locator("#newuser-icon").click({timeout: 20000});
	await page.locator("input[name=name]").fill(name);
	// name, color, then Done: click Next until the home screen is there. Every click is
	// followed by a wait for the screen to change, a click on a button that is
	// being replaced would wait for the whole test timeout
	const home = page.locator(".home-icon").first();
	const currentStep = function() {
		return page.evaluate(function() {
			const visible = Array.from(document.querySelectorAll("[id^=loginscreen_]")).filter(function(step) {
				return step.offsetParent !== null && !step.id.endsWith("_warning");
			});
			return visible.map(function(step) {
				return step.id;
			}).join();
		});
	};
	for (let i = 0; i < 5 && !await home.count(); i++) {
		const step = await currentStep();
		await page.locator("#next-btn").click({timeout: 5000}).catch(function() {});
		await page.waitForFunction(function(previous) {
			if (document.querySelector(".home-icon")) {
				return true;
			}
			const visible = Array.from(document.querySelectorAll("[id^=loginscreen_]")).filter(function(step) {
				return step.offsetParent !== null && !step.id.endsWith("_warning");
			});
			return visible.map(function(step) {
				return step.id;
			}).join() != previous;
		}, step, {timeout: 10000}).catch(function() {});
	}
	await home.waitFor({state: "attached", timeout: 20000});
	// the home tutorial is shown on first launch of a new user, when the home screen is ready
	const tutorial = page.locator(".introjs-skipbutton");
	await tutorial.waitFor({state: "visible", timeout: 1000}).catch(function() {});
	if (await tutorial.isVisible()) {
		await tutorial.click();
		await tutorial.waitFor({state: "hidden", timeout: 10000});
	}
};
