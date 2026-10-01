// Cards of the activity: entry, theme, collection and letter

// Entry with image, text and sound
const AbcdEntry = {
	template: `
		<div class="entry" :class="{'itemEntry-selected': selected}">
			<img v-show="!loaded" src="images/spinner-light.gif" class="spinner">
			<div v-show="loaded">
				<img ref="image" v-show="!textonly && !soundonly" class="entryImage" :class="{entryImageOnly: imageonly}" :src="image" @load="loaded = true" @error="onImageError">
				<img v-show="!imageonly && !textonly" class="entrySoundIcon" :class="{entrySoundIconOnly: soundonly}" :src="soundIcon">
				<div v-show="!imageonly && !soundonly" class="entryText" :class="['entryText' + state.casevalue, {entryTextOnly: textonly}]">{{ text }}</div>
			</div>
		</div>
	`,
	props: {
		index: [String, Number],
		imageonly: Boolean,
		textonly: Boolean,
		soundonly: Boolean,
		tojournal: { type: Number, default: 0 },
		selected: Boolean
	},
	emits: ["sound-ended", "exported"],
	data: function() {
		return {
			state: Abcd.state,
			loaded: false,
			playing: false
		};
	},
	computed: {
		entry: function() {
			return Abcd.entries[this.index];
		},
		image: function() {
			return Abcd.getDatabase() + "images/database/" + this.entry.code + ".png";
		},
		text: function() {
			return Abcd.displayText(this.entry.text);
		},
		sound: function() {
			return this.entry[this.state.lang] ? Abcd.getDatabase() + "audio/" + this.state.lang + "/database/" + this.entry.code : null;
		},
		soundIcon: function() {
			if (this.tojournal) {
				return "icons/journal.svg";
			}
			var only = this.soundonly ? 1 : 0;
			if (this.sound == null) {
				return "images/sound_none" + only + ".png";
			}
			return "images/sound_" + (this.playing ? "on" : "off") + only + ".png";
		}
	},
	watch: {
		index: function() {
			this.loaded = false;
		}
	},
	mounted: function() {
		Abcd.sound.on("ended", this.onSoundEnded);
	},
	beforeUnmount: function() {
		Abcd.sound.off("ended", this.onSoundEnded);
	},
	methods: {
		// Error loading image, probably lost connection to database
		onImageError: function() {
			Abcd.goHome();
		},

		onSoundEnded: function(sound) {
			if (this.playing && sound == this.sound) {
				this.playing = false;
				this.$emit("sound-ended");
			}
		},

		// Play sound, or export the entry to the journal in journal mode
		play: function() {
			if (this.tojournal) {
				if (this.tojournal == 1) {
					this.exportToImage();
				} else {
					this.exportToSound();
				}
				this.$emit("exported");
				return;
			}
			if (this.sound != null) {
				this.playing = true;
				Abcd.sound.play(this.sound);
			}
		},

		abort: function() {
			this.playing = false;
		},

		// Save a datastore entry and tell the user
		saveToJournal: function(mimetype, title, data, messageKey) {
			var metadata = {
				mimetype: mimetype,
				title: title,
				activity: "org.olpcfrance.MediaViewerActivity",
				timestamp: new Date().getTime(),
				creation_time: new Date().getTime(),
				file_size: 0
			};
			Abcd.datastore.create(metadata, function() {
				Abcd.popup.log(Abcd.l10n.get(messageKey));
				console.log("'" + title + "' saved in journal.");
			}, data);
		},

		exportToImage: function() {
			var imgCanvas = document.createElement("canvas");
			imgCanvas.width = imgCanvas.height = 210;
			imgCanvas.getContext("2d").drawImage(this.$refs.image, 0, 0, imgCanvas.width, imgCanvas.height);
			this.saveToJournal("image/png", Abcd.text(this.entry.text) + ".png", imgCanvas.toDataURL("image/png"), "AbecedariumImage");
		},

		exportToSound: function() {
			if (this.sound == null) {
				return;
			}
			var format = ".mp3";
			var mimetype = "audio/mpeg";
			var url = this.sound + format;
			if (this.sound.indexOf("http") != 0) {
				url = window.location.href;
				url = url.substring(0, url.indexOf("/index.html")) + "/" + this.sound + format;
			}
			var title = Abcd.text(this.entry.text) + format;
			var that = this;
			var request = new XMLHttpRequest();
			request.open("GET", url, true);
			request.setRequestHeader("Content-type", mimetype);
			request.responseType = "arraybuffer";
			request.onload = function() {
				if (request.status == 200 || request.status == 0) {
					var base64 = "data:" + mimetype + ";base64," + Abcd.toBase64(new Uint8Array(request.response));
					that.saveToJournal(mimetype, title, base64, "AbecedariumSound");
				}
			};
			request.send();
		}
	}
};

// Theme card
const AbcdTheme = {
	template: `
		<div class="theme" :class="['themeColor' + index, {'itemTheme-selected': selected}]">
			<img v-show="!loaded" src="images/spinner-light.gif" class="spinner">
			<div v-show="loaded">
				<img class="themeImage" :src="image" @load="loaded = true" @error="onImageError">
				<div class="themeText" :class="'themeText' + state.casevalue">{{ text }}</div>
			</div>
		</div>
	`,
	props: { index: Number, selected: Boolean },
	data: function() {
		return { state: Abcd.state, loaded: false };
	},
	computed: {
		theme: function() {
			return Abcd.themes[this.index];
		},
		image: function() {
			return Abcd.getDatabase() + "images/database/" + Abcd.entries[this.theme.img].code + ".png";
		},
		text: function() {
			return Abcd.displayText(this.theme.text);
		}
	},
	methods: {
		onImageError: function() {
			Abcd.goHome();
		}
	}
};

// Collection card
const AbcdCollection = {
	template: `
		<div class="collection" :class="['themeColor' + collection.theme, {'itemCollection-selected': selected}]">
			<img v-show="!loaded" src="images/spinner-light.gif" class="spinner-small">
			<div v-show="loaded">
				<img class="collectionImage" :src="image" @load="loaded = true" @error="onImageError">
				<div class="collectionText" :class="'collectionText' + state.casevalue">{{ text }}</div>
			</div>
		</div>
	`,
	props: { index: [Number, String], selected: Boolean },
	data: function() {
		return { state: Abcd.state, loaded: false };
	},
	computed: {
		collection: function() {
			return Abcd.collections[this.index];
		},
		image: function() {
			return Abcd.getDatabase() + "images/database/" + Abcd.entries[this.collection.img].code + ".png";
		},
		text: function() {
			return Abcd.displayText(this.collection.text);
		}
	},
	watch: {
		index: function() {
			this.loaded = false;
		}
	},
	methods: {
		onImageError: function() {
			Abcd.goHome();
		}
	}
};

// Letter
const AbcdLetter = {
	template: `
		<div class="itemLetter" :class="{'itemLetter-selected': selected}" v-show="loaded && letter !== ''">
			<img class="itemImage" :src="image" @load="loaded = true">
		</div>
	`,
	props: { letter: String, selected: Boolean },
	data: function() {
		return { state: Abcd.state, loaded: false };
	},
	computed: {
		image: function() {
			return "images/letters/" + this.letter.toLowerCase() + this.state.casevalue + ".png";
		}
	}
};

// Play the sound of a letter
Abcd.playLetter = function(letter) {
	Abcd.sound.play(Abcd.getDatabase() + "audio/" + Abcd.state.lang + "/database/upper_" + letter.toUpperCase());
};
