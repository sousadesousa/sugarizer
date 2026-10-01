// Number of entries by page
var entriesByScreen = 8;

// Learn screen: browse themes, collections, letters and their entries
// view is "themes", "collections" or "entries"
const AbcdLearn = {
	template: `
		<div class="board" id="learn">
			<div>
				<div class="colorBar" :class="'themeColor' + theme"></div>
				<abcd-home-button v-show="view == 'themes'" id="learn_home"></abcd-home-button>
				<img id="learn_startSlideshow" v-show="view == 'entries' && slideshowIndex == -1" src="images/slideshow.png" class="standardButton slideshow" @click="startSlideshow">
				<img id="learn_stopSlideshow" v-show="view == 'entries' && slideshowIndex != -1" src="images/pause.png" class="standardButton slideshow" @click="stopSlideshow">
				<abcd-case-button id="learn_caseButton"></abcd-case-button>
				<abcd-language-button id="learn_languageButton"></abcd-language-button>
			</div>
			<div>
				<div id="learn_pageCount" class="pageCount" v-show="view == 'entries'">{{ pageCount }}</div>
				<img id="learn_back" v-show="view != 'themes'" src="images/back.png" class="standardButton backButton" @click="back">
				<img id="learn_prev" v-show="view == 'entries' && start != 0" src="images/previous.png" class="standardButton prevButton" @click="displayPrevEntries">
				<img id="learn_next" v-show="view == 'entries' && start + shown.length < list.length" src="images/next.png" class="standardButton nextButton" @click="displayNextEntries">
			</div>
			<div class="learnBox" :class="'box-4-' + (view == 'themes' ? 'theme' : (view == 'collections' ? 'collection' : 'entry'))">
				<template v-if="view == 'themes'">
					<div class="linebreak"></div>
					<abcd-theme v-for="(item, i) in themes" :key="'t' + i" :index="i" @click="displayCollections(i)"></abcd-theme>
					<div class="linebreak"></div>
					<abcd-letter v-for="letter in alphabet" :key="letter" :letter="letter" @click="displayLetters(letter, true)"></abcd-letter>
				</template>
				<template v-else-if="view == 'collections'">
					<div class="linebreak"></div>
					<div class="linebreak"></div>
					<template v-for="(item, i) in collections" :key="'c' + i">
						<abcd-collection v-if="item.theme == theme" :index="i" @click="displayEntries(i)"></abcd-collection>
					</template>
				</template>
				<template v-else>
					<abcd-entry v-for="(id, i) in shown" :key="start + '-' + i + '-' + id" :ref="function(el) { entryRefs[i] = el; }" :index="id" :tojournal="state.tojournal" @click="playEntry(i)" @sound-ended="soundEnd" @exported="state.tojournal = 0"></abcd-entry>
				</template>
			</div>
		</div>
	`,
	props: { context: String },
	data: function() {
		var alphabet = [];
		for (var i = 0 ; i < 26 ; i++) {
			alphabet.push(String.fromCharCode(97 + i));
		}
		return {
			state: Abcd.state,
			themes: Abcd.themes,
			collections: Abcd.collections,
			alphabet: alphabet,
			view: "themes",
			// Theme (-1 for none, 4 for letters) and collection (index or letter) displayed
			theme: -1,
			collection: -1,
			// All entries of the collection or letter and position of the first one displayed
			list: [],
			start: 0,
			slideshowIndex: -1
		};
	},
	computed: {
		shown: function() {
			return this.list.slice(this.start, this.start + entriesByScreen);
		},
		pageCount: function() {
			return Math.ceil((this.start + this.shown.length) / entriesByScreen) + "/" + Math.ceil(this.list.length / entriesByScreen);
		}
	},
	watch: {
		"state.lang": function() {
			this.languageChanged();
		},
		view: function(view) {
			this.state.learnEntries = (view == "entries");
			if (view != "entries") {
				this.state.tojournal = 0;
			}
		}
	},
	created: function() {
		this.entryRefs = [];
		this.playing = null;
		this.restoreContext();
	},
	mounted: function() {
		this.state.learnEntries = (this.view == "entries");
	},
	beforeUnmount: function() {
		this.state.learnEntries = false;
		this.state.tojournal = 0;
	},
	methods: {
		// Context handling: theme|collection|position
		restoreContext: function() {
			var values = (this.context || "").split("|");
			var theme = values.length > 1 ? parseInt(values[0]) : -1;
			var position = parseInt(values[2]);
			var start = isNaN(position) ? 0 : position + 1;
			if (theme == 4) {
				this.displayLetters(values[1], false, start);
			} else if (theme != -1 && values[1] != "-1" && values[1] !== "") {
				this.displayEntries(parseInt(values[1]), start);
			} else if (theme != -1) {
				this.displayCollections(theme);
			} else {
				this.displayThemes();
			}
		},

		saveContext: function() {
			return [this.theme, this.collection, this.start - 1].join("|");
		},

		// A different language has different entries
		languageChanged: function() {
			if (this.view != "entries") {
				return;
			}
			this.stopSlideshow();
			if (this.theme == 4) {
				if (!this.displayLetters(this.collection, false, 0)) {
					this.displayThemes();
				}
			} else if (Abcd.collectionEntries(this.collection).length == 0) {
				this.displayCollections(this.theme);
			} else {
				this.displayEntries(this.collection, 0);
			}
		},

		displayThemes: function() {
			this.theme = -1;
			this.collection = -1;
			this.view = "themes";
			this.start = 0;
		},

		displayCollections: function(theme) {
			this.theme = parseInt(theme);
			this.collection = -1;
			this.view = "collections";
			this.start = 0;
		},

		// Display entries of a collection
		displayEntries: function(index, start) {
			this.collection = index;
			this.list = Abcd.collectionEntries(index);
			this.showEntries(start || 0);
		},

		// Display entries starting with a letter, return false if there is no one
		displayLetters: function(letter, play, start) {
			if (play) {
				Abcd.playLetter(letter);
			}
			var entries = Abcd.getLetters()[letter];
			if (entries === undefined) {
				return false;
			}
			this.collection = letter;
			this.list = entries;
			this.theme = 4;
			this.showEntries(start || 0);
			return true;
		},

		showEntries: function(start) {
			this.stopSlideshow();
			this.view = "entries";
			this.start = Math.min(start, Math.max(0, this.list.length - 1));
			this.state.tojournal = 0;
		},

		displayNextEntries: function() {
			if (this.start + entriesByScreen < this.list.length) {
				this.showEntries(this.start + entriesByScreen);
			}
		},

		displayPrevEntries: function() {
			this.showEntries(Math.max(0, this.start - entriesByScreen));
		},

		back: function() {
			if (this.view == "entries" && this.theme != 4) {
				this.displayCollections(this.theme);
			} else {
				this.displayThemes();
			}
		},

		// Slideshow handling
		startSlideshow: function() {
			this.slideshowIndex = 0;
			this.playEntry(0);
		},

		stopSlideshow: function() {
			this.slideshowIndex = -1;
		},

		// Play entry sound
		playEntry: function(i) {
			var entry = this.entryRefs[i];
			if (!entry) {
				return;
			}
			if (this.playing != null) {
				this.playing.abort();
			}
			this.playing = entry;
			entry.play();
		},

		soundEnd: function() {
			this.playing = null;
			if (this.slideshowIndex != -1) {
				if (this.entryRefs[++this.slideshowIndex]) {
					this.playEntry(this.slideshowIndex);
				} else {
					this.stopSlideshow();
				}
			}
		}
	}
};
