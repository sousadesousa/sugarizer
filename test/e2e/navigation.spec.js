// Navigation rules of the Electron window (navigation.js), tested with Node: no Electron needed
const { test, expect } = require("@playwright/test");
const path = require("path");
const { pathToFileURL } = require("url");
const { isAppUrl, isExternalUrl, guardWindow } = require("../../navigation.js");

const appPath = path.resolve(__dirname, "../..");
const appFile = function(file) {
	return pathToFileURL(path.join(appPath, file)).href;
};

test("pages of the application are allowed", function() {
	expect(isAppUrl(appFile("index.html"), appPath)).toBe(true);
	expect(isAppUrl(appFile("index.html") + "?rst=1", appPath)).toBe(true);
	expect(isAppUrl(appFile("activities/Paint.activity/index.html") + "?n=Paint&a=org.olpcfrance.Paint#x", appPath)).toBe(true);
	expect(isAppUrl("file://" + appPath + "/index.html", appPath)).toBe(true);
});

test("anything else is refused", function() {
	for (const url of [
		"https://example.com/",
		"http://127.0.0.1:8080/index.html",
		"ws://example.com/",
		"data:text/html,<h1>hi</h1>",
		"javascript:alert(1)",
		"blob:https://example.com/1234",
		"about:blank",
		"chrome://gpu",
		"devtools://devtools/bundled/inspector.html",
		"ftp://example.com/file",
		"",
		"not a url",
		"/index.html",
		"index.html",
		// outside of the application folder
		"file:///etc/passwd",
		appFile("../other/index.html"),
		"file://" + appPath + "/../other/index.html",
		"file://" + appPath + "/%2e%2e/other/index.html",
		pathToFileURL(appPath + "-other/index.html").href,
		// another computer
		"file://example.com/share/index.html"
	]) {
		expect(isAppUrl(url, appPath), url).toBe(false);
	}
});

test("only http and https links go to the system browser", function() {
	expect(isExternalUrl("https://www.sugarizer.org/")).toBe(true);
	expect(isExternalUrl("http://example.com/page?x=1")).toBe(true);
	for (const url of ["file:///etc/passwd", "javascript:alert(1)", "data:text/html,x", "ftp://example.com/", "mailto:a@b.c", "smb://host/share", "ms-msdt:/id", "", "www.example.com"]) {
		expect(isExternalUrl(url), url).toBe(false);
	}
});

test("a window is guarded", function() {
	const handlers = {};
	let openHandler;
	const opened = [];
	guardWindow({
		on: function(name, handler) {
			handlers[name] = handler;
		},
		setWindowOpenHandler: function(handler) {
			openHandler = handler;
		}
	}, appPath, function(url) {
		opened.push(url);
	});
	const navigate = function(name, url) {
		const event = { prevented: false, preventDefault: function() { this.prevented = true; } };
		handlers[name](event, url);
		return event.prevented;
	};
	for (const name of ["will-navigate", "will-redirect"]) {
		expect(navigate(name, appFile("activities/Paint.activity/index.html"))).toBe(false);
		expect(navigate(name, "https://example.com/")).toBe(true);
		expect(navigate(name, "file:///etc/passwd")).toBe(true);
	}
	expect(openHandler({ url: "https://example.com/" })).toEqual({ action: "deny" });
	expect(openHandler({ url: "file:///etc/passwd" })).toEqual({ action: "deny" });
	expect(openHandler({ url: appFile("index.html") })).toEqual({ action: "deny" });
	expect(openHandler({ url: "javascript:alert(1)" })).toEqual({ action: "deny" });
	expect(openHandler({ url: "" })).toEqual({ action: "deny" });
	expect(opened).toEqual(["https://example.com/"]);
});
