#!/usr/bin/env node
// Writes activities/<Name>.activity/activity/activity-icon.svg from the icon drafts chosen
// in the Icon Picker. Usage: node scripts/build-activity-icons.js <picker.html> <picks-dir> [--dry]
// picker.html: the page of the Icon Picker (holds the drafts), picks-dir: its saved `picks` documents.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const [html, picksDir] = process.argv.slice(2, 4);
const dry = process.argv.includes("--dry");
if (!html || !picksDir) {
	console.error("usage: build-activity-icons.js <picker.html> <picks-dir> [--dry]");
	process.exit(1);
}
const src = fs.readFileSync(html, "utf8");
const grab = function(name) {
	const start = src.indexOf("const " + name + " =");
	const end = src.indexOf("\n];", start) >= 0 && name === "ACTS" ? src.indexOf("\n];", start) + 3 : src.indexOf("\n};", start) + 3;
	return src.slice(start, end);
};
const ctx = {};
vm.runInNewContext(grab("ACTS") + "\n" + grab("EXTRA") + "\nthis.ACTS = ACTS; this.EXTRA = EXTRA;", ctx);
const ACTS = ctx.ACTS;
const EXTRA = ctx.EXTRA;

const root = path.join(__dirname, "..", "activities");
const folders = fs.readdirSync(root).filter(f => f.endsWith(".activity")).map(f => f.replace(".activity", ""));
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const alias = { "clockweb": "clock", "fraction": "fractionbounce", "tankoperation": "tankop" };
const folderOf = function(key) {
	let n = norm(key.replace(/^\d+-/, ""));
	n = alias[n] || n;
	return folders.find(f => norm(f) === n);
};

const draft = function(a, choice) {
	const key = a[0];
	if (choice === "a") return a[3];
	if (choice === "b") return a[4];
	if (choice === "c") return EXTRA[key][0];
	if (choice === "d") return EXTRA[key][1];
	return null;
};
const byKey = {};
ACTS.forEach(a => { byKey[a[0]] = a; });

const wrap = function(inner, id) {
	inner = inner.replace(/fill="currentColor"/g, 'fill="&stroke_color;"');
	return '<?xml version="1.0" ?><!DOCTYPE svg PUBLIC \'-//W3C//DTD SVG 1.1//EN\' \'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\' [\n' +
		'\t<!ENTITY stroke_color "#010101">\n\t<!ENTITY fill_color "#FFFFFF">\n' +
		']><svg enable-background="new 0 0 55 55" height="55px" version="1.1" viewBox="0 0 55 55" width="55px" xmlns="http://www.w3.org/2000/svg" xml:space="preserve">' +
		'<g id="' + id + '" transform="translate(4.75 4.75) scale(1.8)" fill="none" stroke="&stroke_color;" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' +
		inner + '</g></svg>\n';
};

let written = 0;
fs.readdirSync(picksDir).filter(f => f.endsWith(".json")).sort().forEach(function(f) {
	const key = f.replace(".json", "");
	const pick = JSON.parse(fs.readFileSync(path.join(picksDir, f), "utf8"));
	let inner;
	let from = key;
	if (pick.choice === "current" || !pick.choice) return;
	if (pick.choice === "new") {
		// the only case: "Option B from MindMath"
		const m = /option\s+([abcd])\s+from\s+(\w+)/i.exec(pick.note || "");
		if (!m) { console.log("skip", key, "(more ideas wanted)"); return; }
		const other = ACTS.find(a => norm(a[1]) === norm(m[2]));
		inner = draft(other, m[1].toLowerCase());
		from = other[0];
	} else {
		inner = draft(byKey[key], pick.choice);
	}
	const folder = folderOf(key);
	if (!folder || !inner) { console.log("NO TARGET", key, pick.choice); return; }
	const file = path.join(root, folder + ".activity", "activity", "activity-icon.svg");
	if (!dry) fs.writeFileSync(file, wrap(inner, "activity-" + norm(folder)));
	console.log(dry ? "would write" : "wrote", folder, "<-", from, pick.choice);
	written++;
});
console.log(written + " icons");
