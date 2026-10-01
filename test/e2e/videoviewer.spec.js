// Video Viewer: libraries, pages, filters, favorites, video dialog, export and the saved context
const fs = require("fs");
const path = require("path");
const { test, expect } = require("@playwright/test");
const helpers = require("./helpers");

const vv = helpers.activities.find(function(activity) {
	return activity.id == "org.olpcfrance.videoviewer";
});
const url = "/" + vv.directory + "/index.html?aid=vv-e2e&a=" + vv.id + "&n=" + encodeURIComponent(vv.name);

const video = fs.readFileSync(path.join(__dirname, "fixtures/video.webm"));
const image = fs.readFileSync(path.join(__dirname, "../../" + vv.directory + "/images/khanacademy.png"));
const titles = ["Photosynthesis", "The water cycle", "Volcanoes", "Fractions", "Multiplication", "Geometry", "The solar system", "Plants and animals", "The moon", "Electricity"];
const categories = ["Science", "Science", "Science", "Math", "Math", "Math", "Space", "Science", "Space", "Science"];
const database = titles.map(function(title, i) {
	return {id: "v" + (i + 1), title: title, category: categories[i], image: "v" + (i + 1)};
});
function library(name, title, db) {
	return {
		name: name, title: title, image: "https://mock.test/lib/" + name + ".png",
		database: "https://mock.test/db/" + db + "_%language%.json",
		videos: "https://mock.test/videos/%id%", images: "https://mock.test/images/%id%.png"
	};
}

// The content of the libraries comes from mock servers
async function mockContent(page) {
	const requests = [];
	await page.route("https://sugarizer.org/content/videos.json*", function(route) {
		requests.push(route.request().url());
		return route.fulfill({json: [library("canope", "Canopé", "canope"), library("khan", "Khan Academy", "khan")]});
	});
	await page.route(/^https?:\/\/mock\.test\//, function(route) {
		const address = route.request().url();
		requests.push(address);
		if (/\/db\/canope_/.test(address)) {
			return route.fulfill({json: database});
		}
		if (/\/db\/khan_/.test(address)) {
			return route.fulfill({json: database.slice(0, 3)});
		}
		if (/\/db\/extra/.test(address)) {
			return route.fulfill({json: library("extra", "Extra", "khan")});
		}
		if (/\/db\/broken/.test(address)) {
			return route.fulfill({json: {name: "broken"}});
		}
		if (/\/videos\//.test(address)) {
			return route.fulfill({body: video, contentType: "video/webm", headers: {"Access-Control-Allow-Origin": "*"}});
		}
		if (/\.png/.test(address)) {
			return route.fulfill({body: image, contentType: "image/png", headers: {"Access-Control-Allow-Origin": "*"}});
		}
		return route.fulfill({status: 404, body: ""});
	});
	return requests;
}

test.beforeEach(async function({ page }) {
	await helpers.useNoServerMode(page);
});

// Create a user and open the activity, or an instance of the journal
async function open(page, objectId) {
	await helpers.createUser(page, "Viewer");
	await page.goto(url + (objectId ? "&o=" + objectId : ""));
}

// Open the activity and choose a library
async function openLibrary(page, title) {
	await open(page);
	await page.locator(".libraryTitle", {hasText: title}).click();
	await expect(page.locator(".item").first()).toBeVisible();
}

function saveContext(page, context) {
	return page.evaluate(function(args) {
		return new Promise(function(resolve) {
			require("sugar-web/datastore").create({
				activity: args.id, mimetype: "text/plain", title: "Video Viewer",
				timestamp: new Date().getTime(), creation_time: new Date().getTime(), file_size: 0
			}, function(error, objectId) {
				resolve(objectId);
			}, JSON.stringify(args.context));
		});
	}, {id: vv.id, context: context});
}

// Context saved in the journal by the activity
function savedContext(page, objectId) {
	return page.evaluate(function(args) {
		return new Promise(function(resolve) {
			const datastore = require("sugar-web/datastore");
			const entry = datastore.find().filter(function(entry) {
				return args.objectId ? entry.objectId == args.objectId : entry.metadata.activity == args.id;
			})[0];
			if (!entry) {
				return resolve(null);
			}
			new datastore.DatastoreObject(entry.objectId).loadAsText(function(error, metadata, data) {
				resolve(JSON.parse(data));
			});
		});
	}, {id: vv.id, objectId: objectId});
}

test("the libraries are listed in the language of the user and one must be chosen", async function({ page }) {
	const errors = helpers.watchErrors(page);
	const requests = await mockContent(page);
	await open(page);
	await expect(page.locator(".library")).toHaveCount(2);
	expect(requests[0]).toMatch(/videos\.json\?lang=en/);
	await expect(page.locator(".libraryTitle").first()).toHaveText("Canopé");
	// without library, the dialog can't be closed
	await page.mouse.click(2, 2);
	await expect(page.locator(".library")).toHaveCount(2);
	await page.locator(".libraryTitle", {hasText: "Canopé"}).click();
	await expect(page.locator(".library-dialog")).toBeHidden();
	await expect(page.locator(".item")).toHaveCount(4);
	await expect(page.locator(".page-count")).toHaveText("1/3");
	expect(errors.real(), errors.report()).toEqual([]);
});

test("pages: buttons and arrow keys", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await mockContent(page);
	await openLibrary(page, "Canopé");
	await expect(page.locator(".previous-button")).toBeHidden();
	await expect(page.locator(".next-button")).toBeVisible();
	await page.keyboard.press("ArrowLeft");
	await expect(page.locator(".page-count")).toHaveText("1/3");
	await page.locator(".next-button").click();
	await expect(page.locator(".page-count")).toHaveText("2/3");
	await expect(page.locator(".itemTitle").first()).toHaveText("Multiplication");
	await expect(page.locator(".previous-button")).toBeVisible();
	await page.keyboard.press("ArrowRight");
	await expect(page.locator(".page-count")).toHaveText("3/3");
	await expect(page.locator(".item")).toHaveCount(2);
	await expect(page.locator(".next-button")).toBeHidden();
	await page.keyboard.press("ArrowRight");
	await expect(page.locator(".page-count")).toHaveText("3/3");
	await page.keyboard.press("ArrowLeft");
	await page.keyboard.press("ArrowLeft");
	await expect(page.locator(".page-count")).toHaveText("1/3");
	expect(errors.real(), errors.report()).toEqual([]);
});

test("filters: category, search text and favorites", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await mockContent(page);
	await openLibrary(page, "Canopé");
	await page.locator("#filter-button").click();
	await expect(page.locator(".filter-item")).toHaveText(["Science", "Math", "Space"]);
	await page.locator(".filter-item", {hasText: "Math"}).click();
	await expect(page.locator(".item")).toHaveCount(3);
	await expect(page.locator(".page-count")).toHaveText("1/1");
	// again to remove the filter
	await page.locator("#filter-button").click();
	await page.locator(".filter-item", {hasText: "Math"}).click();
	await expect(page.locator(".page-count")).toHaveText("1/3");

	// a text, whatever the case, and the cancel icon
	await page.locator(".search-field-input").fill("FRAC");
	await expect(page.locator(".item")).toHaveCount(1);
	await expect(page.locator(".itemTitle")).toHaveText("Fractions");
	await page.locator(".search-field-iconcancel").click();
	await expect(page.locator(".page-count")).toHaveText("1/3");
	await expect(page.locator(".search-field-input")).toHaveValue("");

	// a new filter goes back to the first page
	await page.locator(".next-button").click();
	await page.locator(".search-field-input").fill("o");
	await expect(page.locator(".page-count")).toHaveText(/^1\//);

	// favorites
	await page.locator(".search-field-iconcancel").click();
	await page.locator("#favorite-button").click();
	await expect(page.locator(".item")).toHaveCount(0);
	await expect(page.locator(".page-count")).toHaveText("0/0");
	await page.locator("#favorite-button").click();
	await page.locator(".item .itemPlay").nth(2).click();
	await page.locator(".video-favorite-button").click();
	await page.locator(".video-close-button").click();
	await expect(page.locator(".itemFavorite:visible")).toHaveCount(1);
	await page.locator("#favorite-button").click();
	await expect(page.locator(".item")).toHaveCount(1);
	await expect(page.locator(".itemTitle")).toHaveText("Volcanoes");
	expect(errors.real(), errors.report()).toEqual([]);
});

test("the video dialog plays the video and remembers where the user stopped", async function({ page }) {
	test.setTimeout(60000);
	const errors = helpers.watchErrors(page);
	await mockContent(page);
	await openLibrary(page, "Canopé");
	await page.locator(".item .itemPlay").first().click();
	await expect(page.locator(".video-dialog")).toBeVisible();
	await expect(page.locator(".video-title")).toHaveText("Photosynthesis");
	await expect(page.locator(".video-item")).toHaveAttribute("src", "https://mock.test/videos/v1.mp4");
	await page.locator(".video-item").evaluate(function(node) {
		return new Promise(function(resolve) {
			if (node.readyState >= 1) {
				return resolve();
			}
			node.addEventListener("loadedmetadata", resolve);
		});
	});
	// the video plays a little
	await expect.poll(function() {
		return page.locator(".video-item").evaluate(function(node) {
			return node.currentTime;
		});
	}).toBeGreaterThan(0);
	const time = await page.locator(".video-item").evaluate(function(node) {
		node.pause();
		return node.currentTime;
	});
	await page.locator(".video-close-button").click();
	await expect(page.locator(".video-dialog")).toBeHidden();
	const context = await savedContext(page);
	expect(time).toBeGreaterThan(0);
	expect(context.readtimes.v1).toBeCloseTo(time, 2);
	expect(context.library.name).toBe("canope");
	// the video starts again where the user stopped
	await page.locator(".item .itemPlay").first().click();
	await expect.poll(function() {
		return page.locator(".video-item").evaluate(function(node) {
			return node.currentTime;
		});
	}).toBeGreaterThanOrEqual(time - 0.01);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("libraries: add one, remove one, but not the one used", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await mockContent(page);
	await openLibrary(page, "Canopé");
	await page.locator("#library-button").click();
	await expect(page.locator(".library")).toHaveCount(2);
	// the library used and the last one can't be removed
	await page.locator(".libraryRemove").first().click();
	await expect(page.locator(".library")).toHaveCount(2);
	// incorrect description
	await page.locator(".libraryAdd").click();
	await page.locator(".server-servername").fill("mock.test/db/broken");
	await page.locator(".module-ok-button").click();
	await expect(page.locator(".module-dialog")).toBeHidden();
	await expect(page.locator(".library")).toHaveCount(2);
	// valid description, with enter
	await page.locator(".libraryAdd").click();
	await page.locator(".server-servername").fill("mock.test/db/extra");
	await page.locator(".server-servername").press("Enter");
	await expect(page.locator(".library")).toHaveCount(3);
	await page.locator(".libraryRemove").nth(1).click();
	await expect(page.locator(".library")).toHaveCount(2);
	await expect(page.locator(".libraryTitle")).toHaveText(["Canopé", "Extra"]);
	// a library is selected: the videos change
	await page.locator(".libraryTitle", {hasText: "Extra"}).click();
	await expect(page.locator(".page-count")).toHaveText("1/1");
	await expect(page.locator(".item")).toHaveCount(3);
	expect((await savedContext(page)).libraries.length).toBe(2);
	// cancel closes the dialog
	await page.locator("#library-button").click();
	await page.locator(".libraryAdd").click();
	await page.locator(".module-cancel-button").click();
	await expect(page.locator(".module-dialog")).toBeHidden();
	expect(errors.real(), errors.report()).toEqual([]);
});

test("export mode saves a video in the journal", async function({ page }) {
	test.setTimeout(60000);
	const errors = helpers.watchErrors(page);
	await mockContent(page);
	await openLibrary(page, "Canopé");
	await page.locator("#exportvideo-button").click();
	await expect(page.locator("#exportvideo-button")).toHaveClass(/active/);
	await expect(page.locator(".itemPlay").first()).toHaveAttribute("src", /tojournal/);
	await page.locator(".item .itemPlay").nth(1).click();
	// the mode ends after a click, and no video is shown
	await expect(page.locator("#exportvideo-button")).not.toHaveClass(/active/);
	await expect(page.locator(".video-dialog")).toBeHidden();
	await expect.poll(function() {
		return page.evaluate(function() {
			return require("sugar-web/datastore").find().filter(function(entry) {
				return entry.metadata.mimetype == "video/mp4";
			}).map(function(entry) {
				return entry.metadata.title;
			});
		});
	}).toEqual(["The water cycle.mp4"]);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("the context of the journal comes back: library, filter, page and favorites", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await mockContent(page);
	await open(page);
	const context = {
		filter: {category: "Science", text: "", favorite: false},
		libraries: [library("canope", "Canopé", "canope"), library("khan", "Khan Academy", "khan")],
		library: library("canope", "Canopé", "canope"),
		favorites: {v2: true}, readtimes: {}, currentindex: 4
	};
	const objectId = await saveContext(page, context);
	await page.goto(url + "&o=" + objectId);
	// Science has 5 videos: the second page
	await expect(page.locator(".page-count")).toHaveText("2/2");
	await expect(page.locator(".itemTitle")).toHaveText(["Electricity"]);
	await page.locator(".previous-button").click();
	await expect(page.locator(".itemFavorite:visible")).toHaveCount(1);
	await expect(page.locator(".library-dialog")).toHaveCount(0);
	// the category is selected in the palette
	await page.locator("#filter-button").click();
	await expect(page.locator(".palette-button-selected")).toHaveText("Science");
	await page.locator("#filter-button").click();
	await page.locator(".next-button").click();
	// the page is saved
	await expect.poll(async function() {
		return (await savedContext(page, objectId)).currentindex;
	}).toBe(4);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("a library not reachable shows a warning", async function({ page }) {
	await page.route("https://sugarizer.org/content/videos.json*", function(route) {
		return route.abort();
	});
	await open(page);
	await expect(page.locator(".cloudwarning")).toBeVisible();
	await expect(page.locator(".library")).toHaveCount(0);
});

test("fullscreen hides the toolbar", async function({ page }) {
	await mockContent(page);
	await openLibrary(page, "Canopé");
	const height = await page.locator(".main-content").evaluate(function(node) {
		return node.offsetHeight;
	});
	await page.locator("#fullscreen-button").click();
	await expect(page.locator("#main-toolbar")).toBeHidden();
	await expect(page.locator("#unfullscreen-button")).toBeVisible();
	await expect.poll(function() {
		return page.locator(".main-content").evaluate(function(node) {
			return node.offsetHeight;
		});
	}).toBeGreaterThan(height);
	await page.locator("#unfullscreen-button").click();
	await expect(page.locator("#main-toolbar")).toBeVisible();
	await expect(page.locator("#unfullscreen-button")).toBeHidden();
});

test("tutorial", async function({ page }) {
	const errors = helpers.watchErrors(page);
	await mockContent(page);
	await openLibrary(page, "Canopé");
	await page.locator("#help-button").click();
	const titles = [];
	for (let i = 0; i < 7; i++) {
		await expect(page.locator(".introjs-tooltip-title")).toBeVisible();
		titles.push(await page.locator(".introjs-tooltip-title").innerText());
		await page.locator(".introjs-nextbutton").click();
	}
	expect(titles[0]).toBe("Video Viewer Activity");
	expect(titles).toEqual(["Video Viewer Activity", "Filter", "Favorite videos", "Libraries", "Export videos", "Video", "Search"]);
	expect(errors.real(), errors.report()).toEqual([]);
});

test("every file of the activity exists", async function({ page }) {
	const missing = [];
	page.on("response", function(response) {
		if (response.url().includes(vv.directory) && response.status() >= 400) {
			missing.push(response.url());
		}
	});
	await mockContent(page);
	await openLibrary(page, "Canopé");
	await page.locator("#library-button").click();
	await page.locator(".libraryAdd").click();
	await page.locator(".module-cancel-button").click();
	await page.mouse.click(2, 2);
	await expect(page.locator(".library-dialog")).toBeHidden();
	await page.locator(".item .itemPlay").first().click();
	await expect(page.locator(".video-dialog")).toBeVisible();
	expect(missing, "files missing in Video Viewer").toEqual([]);
});
