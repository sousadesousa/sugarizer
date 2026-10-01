// Abecedarium shared code: state, database and helpers
var Abcd = {
	// Languages of the content, the first one is the default
	languages: ["en", "fr", "es"],

	// Minimum number of entries to allow filtering
	minFilterEntries: 3,

	// Reactive state shared by all screens
	state: Vue.reactive({
		lang: "en",
		casevalue: 0,
		// Url of the online database, used if images and sounds are not installed
		databaseUrl: "",
		localDatabase: true,
		databaseLoaded: false,
		fullscreen: false,
		// Entries of a collection are displayed (the export buttons are available)
		learnEntries: false,
		// Export mode of the entries: 0 none, 1 to image, 2 to sound
		tojournal: 0
	}),

	// Database content
	entries: [],
	themes: [],
	collections: [],
	texts: {},
	letters: {},

	// Home of the activity, called when the database can't be reached
	goHome: function() {}
};

// Prefix of images and sounds, empty if they are installed with the activity
Abcd.getDatabase = function() {
	return Abcd.state.localDatabase ? "" : Abcd.state.databaseUrl;
};

// Localized text of the database
Abcd.text = function(code) {
	var texts = Abcd.texts[Abcd.state.lang] || Abcd.texts.en || {};
	var value = texts[code];
	if (value !== undefined) {
		return value.replace(/%27/g, "'").replace(/%22/g, "\"");
	}
	return code;
};

// Text of an entry, theme or collection in the current case
Abcd.displayText = function(code) {
	var text = Abcd.text(code);
	return Abcd.state.casevalue == 1 ? text.toUpperCase() : text;
};

// Entries by first letter for the current language
Abcd.getLetters = function() {
	return Abcd.letters[Abcd.state.lang] || Abcd.letters.en || {};
};

// Content language to use for a language of the user
Abcd.contentLanguage = function(language) {
	var code = (language || "").split("-")[0];
	return Abcd.languages.indexOf(code) != -1 ? code : Abcd.languages[0];
};

// Load all database files, callback(error)
Abcd.loadDatabase = function(callback) {
	var files = {
		url: "database/db_url.json",
		entries: "database/db_meta.json",
		themes: "database/db_themes.json",
		collections: "database/db_collections.json"
	};
	Abcd.languages.forEach(function(lang) {
		files["texts_" + lang] = "database/db_" + lang + ".json";
		files["letters_" + lang] = "database/db_" + lang + "_letters.json";
	});
	requirejs(["lib/axios.min.js"], function(axios) {
		var keys = Object.keys(files);
		Promise.all(keys.map(function(key) {
			return axios.get(files[key]).then(function(response) {
				return response.data;
			});
		})).then(function(values) {
			var data = {};
			keys.forEach(function(key, i) {
				data[key] = values[i];
			});
			Abcd.state.databaseUrl = data.url;
			Abcd.entries = data.entries;
			Abcd.themes = data.themes;
			Abcd.collections = data.collections;
			Abcd.languages.forEach(function(lang) {
				Abcd.texts[lang] = data["texts_" + lang];
				Abcd.letters[lang] = data["letters_" + lang];
			});
			Abcd.state.databaseLoaded = true;
			callback(null);
		}).catch(function(error) {
			console.log("Error loading database", error);
			Abcd.state.databaseLoaded = false;
			callback(error);
		});
	});
};

// Check if the images and sounds are installed with the activity
Abcd.checkDatabase = function(callback) {
	var image = new Image();
	image.onload = function() {
		Abcd.state.localDatabase = true;
		callback(true);
	};
	image.onerror = function() {
		Abcd.state.localDatabase = false;
		callback(false);
	};
	image.src = "images/database/_ping.png?" + (new Date()).getTime();
};

// Entries of a collection available in the current language
Abcd.collectionEntries = function(collectionIndex) {
	var entries = Abcd.collections[collectionIndex].entries;
	return entries.filter(function(entry) {
		return Abcd.entries[entry][Abcd.state.lang] == 1;
	});
};

// Randomly get an entry in the current language
// filter is null, {kind: "Abcd.Letter", letter: "a"} or {kind: "Abcd.Collection", index: 3}
Abcd.randomEntryIndex = function(excludes, filter) {
	var value = null;
	if (filter != null && filter.kind == "Abcd.Collection") {
		value = Abcd.collectionEntries(filter.index);
	} else {
		// Choose a letter
		var letters = Abcd.getLetters();
		var keys = Object.keys(letters);
		var key = (filter != null && letters[filter.letter]) ? filter.letter : keys[Math.floor(Math.random() * keys.length)];
		value = letters[key];
	}
	var candidates = value.filter(function(entry) {
		return !excludes || excludes.indexOf(entry) == -1;
	});
	return candidates[Math.floor(Math.random() * candidates.length)];
};

// Mix an array into a new one
Abcd.mix = function(chain) {
	var mixed = chain.slice();
	for (var i = mixed.length - 1 ; i > 0 ; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = mixed[i];
		mixed[i] = mixed[j];
		mixed[j] = tmp;
	}
	return mixed;
};

// Bytes to base 64
Abcd.toBase64 = function(bytes) {
	var binary = "";
	for (var i = 0 ; i < bytes.length ; i += 0x8000) {
		binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
};
