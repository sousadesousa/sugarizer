// Rules of navigation of the Electron window, used by main.js (no dependency on Electron to be testable with Node)
//
// The window only shows the pages of the application (file:// URLs inside the application folder): the Sugarizer
// server, when the user connects to one, is only called by the pages (XHR and WebSocket), never navigated to.
// Links to the web (http and https only) are opened in the system browser.
const path = require("path");
const { fileURLToPath } = require("url");

// Is this URL a page of the application, i.e. a file inside the application folder?
function isAppUrl(url, appPath) {
	let parsed;
	try {
		parsed = new URL(url);
		if (parsed.protocol !== "file:") {
			return false;
		}
		const file = path.resolve(fileURLToPath(parsed));
		const root = path.resolve(appPath);
		return file === root || file.startsWith(root.endsWith(path.sep) ? root : root + path.sep);
	} catch (e) {
		// not a URL, or a file URL that points to another computer
		return false;
	}
}

// Can this URL be opened in the system browser?
function isExternalUrl(url) {
	try {
		const protocol = new URL(url).protocol;
		return protocol === "http:" || protocol === "https:";
	} catch (e) {
		return false;
	}
}

// Protect a window: no navigation out of the application and controlled new windows
// (openExternal opens a URL in the system browser)
function guardWindow(webContents, appPath, openExternal) {
	const guard = function(event, url) {
		if (!isAppUrl(url, appPath)) {
			event.preventDefault();
		}
	};
	webContents.on("will-navigate", guard);
	webContents.on("will-redirect", guard);
	webContents.setWindowOpenHandler(function(details) {
		if (isExternalUrl(details.url)) {
			openExternal(details.url);
		}
		return { action: "deny" };
	});
}

module.exports = { isAppUrl, isExternalUrl, guardWindow };
