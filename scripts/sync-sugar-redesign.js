#!/usr/bin/env node
// Adds the redesign stylesheets to activities (see docs/redesign.md).
//   node scripts/sync-sugar-redesign.js Memorize SprintMath   add the links to those activities
//   node scripts/sync-sugar-redesign.js --check Memorize      only report, change nothing (exit 1 if a link is missing)
// An activity is a folder name without ".activity". Idempotent.
var fs = require("fs");
var path = require("path");

var args = process.argv.slice(2);
var check = args.indexOf("--check") != -1;
var names = args.filter(function(a) { return a != "--check"; });
if (!names.length) {
	console.error("usage: sync-sugar-redesign.js [--check] <Activity> [...]");
	process.exit(2);
}

var TOKENS = '<link rel="stylesheet" href="../../css/tokens.css">';
var SHEET = '<link rel="stylesheet" href="../../css/sugar-redesign.css">';
var missing = 0;

names.forEach(function(name) {
	var file = path.join(__dirname, "..", "activities", name + ".activity", "index.html");
	if (!fs.existsSync(file)) {
		console.log(name + ": index.html not found");
		missing++;
		return;
	}
	var html = fs.readFileSync(file, "utf8");
	var hasTokens = html.indexOf("css/tokens.css") != -1;
	var hasSheet = html.indexOf("css/sugar-redesign.css") != -1;
	var link96 = /[ \t]*<link[^>]*sugar-96dpi\.css[^>]*>/.exec(html);
	var link200 = /<link[^>]*sugar-200dpi\.css[^>]*>/.exec(html);
	if (!link96 || !link200) {
		console.log(name + ": no sugar-96dpi.css and sugar-200dpi.css links (needs a manual look)");
		missing++;
		return;
	}
	if (hasTokens && hasSheet) {
		console.log(name + ": ok");
		return;
	}
	if (check) {
		console.log(name + ": missing " + (hasTokens ? "" : "tokens.css ") + (hasSheet ? "" : "sugar-redesign.css"));
		missing++;
		return;
	}
	// the sheet goes right after the 200dpi link (so activity css and bootstrap still come later), tokens before the 96dpi link
	if (!hasSheet) {
		var at = html.indexOf(link200[0]) + link200[0].length;
		html = html.slice(0, at) + "\n    " + SHEET + html.slice(at);
	}
	if (!hasTokens) {
		var start = html.indexOf(link96[0]);
		var indent = /^[ \t]*/.exec(link96[0])[0];
		html = html.slice(0, start) + indent + TOKENS + "\n" + html.slice(start);
	}
	fs.writeFileSync(file, html);
	console.log(name + ": links added");
});
process.exit(missing ? 1 : 0);
