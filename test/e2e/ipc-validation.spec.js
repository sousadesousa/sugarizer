// Validation of the arguments of the Electron IPC handlers (ipc-validation.js), tested with Node: no Electron needed
const { test, expect } = require("@playwright/test");
const path = require("path");
const os = require("os");
const { isBaseName, validateSaveRequest, validateTempfileRequest } = require("../../ipc-validation.js");

const chosen = path.join(os.tmpdir(), "chosen-dir");

test("only plain base names are accepted as file names", function() {
	for (const name of ["a.json", "My drawing.png", "été.txt", "..a.json", "a..b"]) {
		expect(isBaseName(name), name).toBe(true);
	}
	const bad = ["", ".", "..", "../a.json", "a/b.json", "a\\b.json", "/etc/passwd", "C:\\x.json", "c:x.json", "..\\..\\x", "a\u0000.json", "a\n.json",
		"x".repeat(300), null, undefined, 12, {}, ["a.json"]];
	for (const name of bad) {
		expect(isBaseName(name), String(name)).toBe(false);
	}
});

test("save: without directory the user is asked", function() {
	const result = validateSaveRequest({ filename: "a.json", text: "{}" }, []);
	expect(result).toEqual({ ok: true, target: null, filename: "a.json" });
	expect(validateSaveRequest({ filename: "a.png", binary: new ArrayBuffer(4), directory: null }, []).target).toBe(null);
});

test("save: a directory is accepted only when the user chose it", function() {
	const ok = validateSaveRequest({ directory: chosen, filename: "a.json", text: "{}" }, new Set([chosen]));
	expect(ok).toEqual({ ok: true, target: path.join(chosen, "a.json"), filename: "a.json" });
	// not chosen, parent of a chosen one, sibling, traversal out of it, relative
	for (const directory of [os.tmpdir(), path.dirname(chosen), chosen + "-other", path.join(chosen, "..", "x"), "chosen-dir", "~", 12, {}]) {
		expect(validateSaveRequest({ directory, filename: "a.json", text: "{}" }, [chosen]).ok, String(directory)).toBe(false);
	}
	expect(validateSaveRequest({ directory: chosen, filename: "a.json", text: "{}" }, []).ok).toBe(false);
	// a chosen directory written with a traversal that resolves to itself is the same directory
	expect(validateSaveRequest({ directory: path.join(chosen, "sub", ".."), filename: "a.json", text: "{}" }, [chosen]).ok).toBe(true);
});

test("save: bad file name, extension or content are refused", function() {
	const chosenSet = [chosen];
	expect(validateSaveRequest({ directory: chosen, filename: "../../.bashrc", text: "x" }, chosenSet).ok).toBe(false);
	expect(validateSaveRequest({ directory: chosen, filename: "sub/a.json", text: "x" }, chosenSet).ok).toBe(false);
	expect(validateSaveRequest({ directory: chosen, filename: "run.sh", text: "x" }, chosenSet).ok).toBe(false);
	expect(validateSaveRequest({ directory: chosen, filename: "run.exe", text: "x" }, chosenSet).ok).toBe(false);
	expect(validateSaveRequest({ directory: chosen, filename: "noextension", text: "x" }, chosenSet).ok).toBe(false);
	expect(validateSaveRequest({ filename: "../a.json", text: "x" }, []).ok).toBe(false);
	expect(validateSaveRequest({ filename: "a.json" }, []).ok).toBe(false);
	expect(validateSaveRequest(null, []).ok).toBe(false);
	expect(validateSaveRequest("a.json", []).ok).toBe(false);
});

test("tempfile: decodes a data URL and refuses invalid requests", function() {
	const result = validateTempfileRequest({ text: "data:image/png;base64," + Buffer.from("hello").toString("base64") });
	expect(result.ok).toBe(true);
	expect(result.buffer.toString()).toBe("hello");
	expect(validateTempfileRequest({ text: Buffer.from("raw").toString("base64") }).buffer.toString()).toBe("raw");
	for (const arg of [null, undefined, "text", {}, { text: 12 }, { text: ["a"] }]) {
		expect(validateTempfileRequest(arg).ok, JSON.stringify(arg)).toBe(false);
	}
	expect(validateTempfileRequest({ text: "A".repeat(300 * 1024 * 1024) }).ok).toBe(false);
});
