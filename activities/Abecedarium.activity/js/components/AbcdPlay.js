// Number of games to play
var entriesByGame = 4;

// Options of an entry for a type of card: picture, listen (sound) or letter
function entryOptions(value) {
	return {
		soundonly: value == "listen",
		imageonly: value == "picture",
		textonly: value.substr(0, 6) == "letter"
	};
}

// Play screen: guess the entry matching a picture, a text or a sound
const AbcdPlay = {
	template: `
		<div class="board" id="play">
			<div>
				<div class="colorBar" :class="'themeColor' + theme"></div>
				<abcd-home-button v-show="theme == -1 && !finished" id="play_home"></abcd-home-button>
				<abcd-case-button v-show="!finished" id="play_caseButton"></abcd-case-button>
				<abcd-language-button v-show="!finished" id="play_languageButton"></abcd-language-button>
			</div>
			<div>
				<abcd-letter v-if="filter != null && filter.kind == 'Abcd.Letter'" class="filterLetter" :letter="filter.letter"></abcd-letter>
				<abcd-collection v-if="filter != null && filter.kind == 'Abcd.Collection'" class="filterCollection" :index="filter.index"></abcd-collection>
				<div id="play_itemCount" class="itemCount" v-show="theme != -1 && !finished">{{ (gamecount + 1) + "/" + entriesByGame }}</div>
				<img id="play_back" v-show="theme != -1 && !finished" src="images/back.png" class="standardButton backButton" @click="backTaped">
				<img id="play_filter" v-show="theme == -1 && !finished" src="images/filter.png" class="standardButton filterButton" @click="showFilter = true">
				<img id="play_check" v-show="theme != -1 && !finished" src="images/check.png" class="standardButton checkButton" @click="checkTaped">
				<div class="gameFinished" v-if="finished">
					<div class="gameFinsihed-message">{{ finishedMessage }}</div>
					<div class="gameFinished-controls">
						<img id="play_replay" src="images/redo.svg" class="standardButton replayButton" @click="replayTaped">
						<img id="play_backSelection" src="images/back.png" class="standardButton backButton backSelection" @click="backToSelectionTaped">
					</div>
				</div>
			</div>
			<div class="playbox">
				<template v-if="theme == -1 && !finished">
					<abcd-play-type-button v-for="(button, i) in buttons" :key="i" :id="'play_playTypeButton' + (i == 0 ? '' : i + 1)" :from="button.from" :to="button.to" :theme="button.theme" @click="doGame(button)"></abcd-play-type-button>
				</template>
				<template v-else-if="!finished && fromIndex !== null">
					<abcd-entry :key="'from' + gameKey" ref="fromEntry" class="entryPlayFrom" :class="fromClass" :index="fromIndex" :soundonly="fromOptions.soundonly" :imageonly="fromOptions.imageonly" :textonly="fromOptions.textonly" @click="entryTaped(-1)"></abcd-entry>
					<abcd-entry v-for="(id, i) in choices" :key="'to' + gameKey + '-' + i" :ref="function(el) { choiceRefs[i] = el; }" class="entryPlayTo" :class="choiceClass(i)" :index="id" :soundonly="toOptions.soundonly" :imageonly="toOptions.imageonly" :textonly="toOptions.textonly" @click="entryTaped(i)"></abcd-entry>
				</template>
			</div>
			<abcd-filter v-if="showFilter" :filter="filter" @change="filterChanged" @close="showFilter = false"></abcd-filter>
		</div>
	`,
	props: { context: String },
	data: function() {
		return {
			state: Abcd.state,
			entriesByGame: entriesByGame,
			// Theme of the colors: -1 to choose a type of game, 5, 6 or 7 from picture, text or sound
			theme: -1,
			gamecount: 0,
			themeButton: null,
			filter: null,
			showFilter: false,
			finished: false,
			finishedMessage: "",
			gameKey: 0,
			fromIndex: null,
			choices: [],
			// Selected card: null, -1 for the card to find or the index of a choice
			selected: null,
			// State of the selected card: "selected", "wrong" or "right"
			status: "",
			forbid: false
		};
	},
	computed: {
		buttons: function() {
			var letter = "letter" + this.state.casevalue;
			return [
				{ from: "picture", to: letter, theme: "play-button-color1" },
				{ from: "picture", to: "listen", theme: "play-button-color1" },
				{ from: letter, to: "picture", theme: "play-button-color2" },
				{ from: letter, to: "listen", theme: "play-button-color2" },
				{ from: "listen", to: "picture", theme: "play-button-color3" },
				{ from: "listen", to: letter, theme: "play-button-color3" }
			];
		},
		fromOptions: function() {
			return entryOptions(this.themeButton ? this.themeButton.from : "");
		},
		toOptions: function() {
			return entryOptions(this.themeButton ? this.themeButton.to : "");
		},
		fromClass: function() {
			return this.selected === -1 ? "entryPlay" + this.statusName : "";
		},
		statusName: function() {
			return { selected: "Selected", wrong: "Wrong", right: "Right" }[this.status] || "";
		}
	},
	watch: {
		"state.lang": function() {
			// Remove filter because too risky, and change game because it could not exist in the new language
			this.filter = null;
			if (this.theme != -1 && !this.finished) {
				this.computeGame();
			}
		}
	},
	created: function() {
		this.choiceRefs = [];
		this.playing = null;
		this.restoreContext();
	},
	mounted: function() {
		Abcd.sound.on("ended", this.endSound);
	},
	beforeUnmount: function() {
		Abcd.sound.off("ended", this.endSound);
	},
	methods: {
		// Context handling: theme|gamecount|from|to|filter kind|filter value
		restoreContext: function() {
			var values = (this.context || "").split("|");
			if (values.length < 6) {
				return;
			}
			this.gamecount = parseInt(values[1]);
			if (values[4] != "") {
				this.filter = values[4] == "Abcd.Letter" ? { kind: values[4], letter: values[5] } : { kind: values[4], index: parseInt(values[5]) };
			}
			if (parseInt(values[0]) != -1) {
				this.doGame({ from: values[2], to: values[3] });
			}
			if (this.gamecount === entriesByGame) {
				this.showGameFinished();
			}
		},

		saveContext: function() {
			var values = [this.theme, this.gamecount];
			values.push(this.themeButton != null ? this.themeButton.from : "");
			values.push(this.themeButton != null ? this.themeButton.to : "");
			if (this.filter != null) {
				values.push(this.filter.kind);
				values.push(this.filter.kind == "Abcd.Letter" ? this.filter.letter : this.filter.index);
			} else {
				values.push("");
				values.push("");
			}
			return values.join("|");
		},

		filterChanged: function(filter) {
			this.filter = filter;
			this.showFilter = false;
		},

		// Start a type of game
		doGame: function(button) {
			this.themeButton = { from: button.from, to: button.to };
			if (button.from == "picture") this.theme = 5;
			else if (button.from == "listen") this.theme = 7;
			else this.theme = 6;
			this.computeGame();
		},

		// Choose the card to find and the cards to choose
		computeGame: function() {
			this.forbid = false;
			this.selected = null;
			this.status = "";
			this.choiceRefs = [];
			this.gameKey++;
			var tofind = Abcd.randomEntryIndex(undefined, this.filter);
			var excludes = [tofind];
			for (var i = 0 ; i < 2 ; i++) {
				excludes.push(Abcd.randomEntryIndex(excludes, this.filter));
			}
			this.fromIndex = tofind;
			this.choices = Abcd.mix(excludes);

			// Play the card to find if it's a sound
			if (this.fromOptions.soundonly) {
				var that = this;
				this.$nextTick(function() {
					that.playing = that.$refs.fromEntry;
					that.playing.play();
				});
			}
		},

		choiceClass: function(i) {
			return this.selected === i ? "entryPlay" + this.statusName : "";
		},

		// Entry taped: play sound and/or select entry
		entryTaped: function(i) {
			if (this.forbid) {
				return;
			}
			var entry = i == -1 ? this.$refs.fromEntry : this.choiceRefs[i];
			var options = i == -1 ? this.fromOptions : this.toOptions;
			if (options.soundonly) {
				if (this.playing != null) {
					this.playing.abort();
				}
				this.playing = entry;
				entry.play();
			}

			// Don't select the card to find
			if (i == -1) {
				return;
			}
			this.selected = i;
			this.status = "selected";
		},

		showGameFinished: function() {
			this.finished = true;
			this.theme = -1;
			this.finishedMessage = Abcd.l10n ? Abcd.l10n.get("GameFinised") : "";
		},

		replayTaped: function() {
			this.finished = false;
			this.gamecount = 0;
			this.doGame(this.themeButton);
		},

		backToSelectionTaped: function() {
			this.finished = false;
			this.backTaped();
		},

		// Go to the home of the game
		backTaped: function() {
			this.theme = -1;
			this.gamecount = 0;
			this.selected = null;
			this.status = "";
			this.fromIndex = null;
			this.themeButton = null;
		},

		checkTaped: function() {
			if (this.forbid) {
				return;
			}
			this.forbid = true;
			if (this.playing != null) {
				this.playing.abort();
			}
			if (this.selected === null) {
				Abcd.sound.play("audio/disappointed");
				this.selected = -1;
				this.status = "wrong";
			} else if (this.choices[this.selected] == this.fromIndex) {
				Abcd.sound.play("audio/applause");
				this.status = "right";
			} else {
				Abcd.sound.play("audio/disappointed");
				this.status = "wrong";
			}
		},

		endSound: function(sound) {
			// Prematured end
			if (this.selected === null) {
				return;
			}

			// Bad check, retry
			if (sound == "audio/disappointed") {
				this.selected = null;
				this.status = "";
				this.forbid = false;

			// Good check
			} else if (sound == "audio/applause") {
				this.selected = null;
				this.status = "";

				// Next game or finish
				if (++this.gamecount == entriesByGame) {
					this.showGameFinished();
				} else {
					this.computeGame();
				}
			}
		}
	}
};
