// Validation of the arguments sent by the renderer to the ipcMain handlers of main.js
// (plain functions, no dependency on Electron to be testable with Node)
//
// The renderer is untrusted: a page of the application (or an activity) that is compromised must not be able to
// write anywhere on the disk. Rules:
// - a file name is only a base name (no directory part, no "..", no control character) with a known extension;
// - a directory is only used without a dialog if the user chose it before with the "choose directory" dialog;
//   otherwise the user is asked where to save.
const path = require("path");

const MAX_FILENAME_LENGTH = 255;
const MAX_TEMPFILE_SIZE = 200 * 1024 * 1024;

// Extensions the application writes (see js/modules/file.js)
const SAVE_EXTENSIONS = ["json", "jpg", "png", "wav", "webm", "mp3", "mp4", "txt", "pdf", "doc", "odt", "csv", "bin"];

// Is this a plain file name, i.e. only a base name?
function isBaseName(name) {
	if (typeof name !== "string" || name.length === 0 || name.length > MAX_FILENAME_LENGTH) {
		return false;
	}
	// control characters (including NUL), separators of both platforms, drive letters and "." / ".."
	if (/[\u0000-\u001f\\/:]/.test(name) || name === "." || name === "..") {
		return false;
	}
	return path.basename(name) === name && path.win32.basename(name) === name;
}

// Does this file name end with an extension the application writes?
function hasSaveExtension(name) {
	const extension = path.extname(name).substr(1).toLowerCase();
	return SAVE_EXTENSIONS.indexOf(extension) !== -1;
}

// Validate the argument of "save-file-dialog". chosenDirectories is the collection (Set or array) of the directories
// chosen by the user. Returns {ok: true, target: <full path or null to ask the user>, filename} or {ok: false, error}
function validateSaveRequest(arg, chosenDirectories) {
	if (!arg || typeof arg !== "object") {
		return { ok: false, error: "invalid request" };
	}
	if (!isBaseName(arg.filename)) {
		return { ok: false, error: "invalid file name" };
	}
	if (typeof arg.text !== "string" && typeof arg.binary !== "string" && !(arg.binary instanceof ArrayBuffer) && !ArrayBuffer.isView(arg.binary)) {
		return { ok: false, error: "no content" };
	}
	if (arg.directory === undefined || arg.directory === null || arg.directory === "") {
		return { ok: true, target: null, filename: arg.filename };
	}
	if (typeof arg.directory !== "string" || !path.isAbsolute(arg.directory)) {
		return { ok: false, error: "invalid directory" };
	}
	const directory = path.resolve(arg.directory);
	const chosen = Array.from(chosenDirectories || []).map(function (dir) {
		return path.resolve(dir);
	});
	if (chosen.indexOf(directory) === -1) {
		return { ok: false, error: "directory not chosen by the user" };
	}
	if (!hasSaveExtension(arg.filename)) {
		return { ok: false, error: "invalid file extension" };
	}
	return { ok: true, target: path.join(directory, arg.filename), filename: arg.filename };
}

// Validate the argument of "create-tempfile". Returns {ok: true, buffer} or {ok: false, error}
function validateTempfileRequest(arg) {
	if (!arg || typeof arg !== "object" || typeof arg.text !== "string") {
		return { ok: false, error: "invalid request" };
	}
	if (arg.text.length > MAX_TEMPFILE_SIZE * 1.4) {
		return { ok: false, error: "content too big" };
	}
	const buffer = Buffer.from(arg.text.replace(/^data:.+;base64,/, ""), "base64");
	if (buffer.length > MAX_TEMPFILE_SIZE) {
		return { ok: false, error: "content too big" };
	}
	return { ok: true, buffer };
}

module.exports = { isBaseName, hasSaveExtension, validateSaveRequest, validateTempfileRequest, SAVE_EXTENSIONS };
