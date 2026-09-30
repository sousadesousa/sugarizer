// Copy the third-party libraries of activities from node_modules, or check they are up to date
//
// Each activity may have a libs.json listing its library files and where they come from:
//   {
//     "lib/require.js": "lib-requirejs/require.js",
//     "lib/humane.js": {
//       "from": "lib-humane-js/humane.js",
//       "patches": [{"reason": "...", "find": "...", "replace": "..."}]
//     }
//   }
// "from" is a path in node_modules: the packages are devDependencies of the root
// package.json, named lib-* and pinned to an exact version.
// Local changes to a library are listed as patches, applied after the copy.
//
// Usage:
//   node scripts/activity-libs.js update [Activity.activity ...]   copy libraries (all activities by default)
//   node scripts/activity-libs.js check [Activity.activity ...]    fail if a library differs from its source

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const activitiesDir = path.join(root, "activities");
const modulesDir = path.join(root, "node_modules");

// Activities with a libs.json, or the ones given
function activities(names) {
	if (names.length) {
		return names;
	}
	return fs.readdirSync(activitiesDir).filter(function(name) {
		return fs.existsSync(path.join(activitiesDir, name, "libs.json"));
	});
}

// Expected content of a library file
function expected(activity, file, source) {
	const spec = typeof source === "string" ? {from: source} : source;
	const from = path.join(modulesDir, spec.from);
	if (!fs.existsSync(from)) {
		throw new Error(activity + "/" + file + ": " + spec.from + " not found, run npm install");
	}
	let content = fs.readFileSync(from, "utf8");
	(spec.patches || []).forEach(function(patch) {
		const count = content.split(patch.find).length - 1;
		if (count !== 1) {
			throw new Error(activity + "/" + file + ": patch \"" + patch.reason + "\" matches " + count + " times in " + spec.from + ", expected once");
		}
		content = content.replace(patch.find, function() {
			return patch.replace;
		});
	});
	return content;
}

function run(command, names) {
	let problems = 0;
	activities(names).forEach(function(activity) {
		const manifest = path.join(activitiesDir, activity, "libs.json");
		if (!fs.existsSync(manifest)) {
			console.log(activity + ": no libs.json");
			problems++;
			return;
		}
		const libs = JSON.parse(fs.readFileSync(manifest, "utf8"));
		Object.keys(libs).forEach(function(file) {
			const target = path.join(activitiesDir, activity, file);
			let content;
			try {
				content = expected(activity, file, libs[file]);
			} catch (error) {
				console.log(error.message);
				problems++;
				return;
			}
			const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
			if (current === content) {
				return;
			}
			if (command === "update") {
				fs.writeFileSync(target, content);
				console.log("updated " + activity + "/" + file);
			} else {
				console.log(activity + "/" + file + " differs from its source, run: npm run libs:update");
				problems++;
			}
		});
	});
	return problems;
}

const command = process.argv[2];
if (command !== "update" && command !== "check") {
	console.log("usage: node scripts/activity-libs.js update|check [Activity.activity ...]");
	process.exit(2);
}
const problems = run(command, process.argv.slice(3));
if (problems) {
	process.exit(1);
}
console.log(command === "check" ? "activity libraries up to date" : "done");
