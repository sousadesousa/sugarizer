// Sounds theme
var soundThemes = ["audio/theme_piano", "audio/theme_guitar", "audio/theme_violon", "audio/theme_oboe", "audio/theme_trompet", "audio/theme_mallets", "audio/theme_soprano"];
// Position in ms of the notes of each theme, one by letter of the alphabet
var soundNotesPos = [24, 536, 1024, 1536, 2057, 2569, 3048, 4040, 4552, 5032, 5560, 6064, 6349, 6570, 6836, 7072, 8056, 8560, 9072, 10071, 10575, 11071, 12063, 13061, 14063, 15062];
// How long the letter of a note stays displayed (ms)
var letterDuration = 450;

// Home screen
const AbcdHome = {
	template: `
		<div class="main">
			<div>
				<img class="logo" src="images/logo.png">
				<img id="app_instrument" class="instrument no-select-image" :src="'images/instrument' + soundindex + '.png'" @click="nextInstrument">
				<div class="letter">{{ letter }}</div>
			</div>
			<div>
				<img id="app_credit" class="creditButton no-select-image" src="images/credit.png" @click="$emit('credits')">
				<img id="app_learn" class="learnButton no-select-image" src="images/learn.png" @click="$emit('learn')">
				<img id="app_play" class="playButton no-select-image" src="images/play.png" @click="$emit('play')">
				<img id="app_build" class="buildButton no-select-image" src="images/build.png">
			</div>
		</div>
	`,
	emits: ["credits", "learn", "play"],
	data: function() {
		return { soundindex: 0, letter: "" };
	},
	mounted: function() {
		Abcd.sound.on("ended", this.onEnd);
		Abcd.sound.on("timeupdate", this.onTimeupdate);
		this.playTheme();
	},
	beforeUnmount: function() {
		Abcd.sound.off("ended", this.onEnd);
		Abcd.sound.off("timeupdate", this.onTimeupdate);
	},
	methods: {
		playTheme: function() {
			this.soundindex = 0;
			Abcd.sound.play(soundThemes[this.soundindex]);
		},

		// Sound ended, play next instrument
		onEnd: function(sound) {
			if (sound == soundThemes[this.soundindex]) {
				this.nextInstrument();
			}
		},

		nextInstrument: function() {
			this.soundindex = (this.soundindex + 1) % soundThemes.length;
			this.letter = "";
			Abcd.sound.play(soundThemes[this.soundindex]);
		},

		// Display the letter of the note played
		onTimeupdate: function(time) {
			var found = -1;
			for (var i = 0 ; i < soundNotesPos.length && soundNotesPos[i] <= time + 50 ; i++) {
				found = i;
			}
			this.letter = (found != -1 && time - soundNotesPos[found] < letterDuration) ? String.fromCharCode(65 + found) : "";
		}
	}
};

// Credits popup
const AbcdCredits = {
	template: `
		<div class="abcd-scrim" @click.self="$emit('close')">
			<div class="credits-popup abcd-popup">
				<img src="images/class.png" class="credit-image">
				<div class="credit-content">
					<template v-for="section in credits">
						<div class="credit-title">{{ section.title }}</div>
						<div class="credit-name" v-for="name in section.names">{{ name }}</div>
					</template>
				</div>
			</div>
		</div>
	`,
	emits: ["close"],
	data: function() {
		return {
			credits: [
				{ title: "concept:", names: ["Lionel Laské"] },
				{ title: "code:", names: ["Lionel Laské, Joakim Ribier (spanish version)"] },
				{ title: "arts:", names: [
					"Art4Apps (images)",
					"Vicki Wenderlich (letters)",
					"TamTam Mini (music instruments)",
					"Cursive Standard from dafont.com (cursive font)",
					"Nordic factory (flags)",
					"Giorgia Guarino from The Noun Project (listen icon)",
					"Drew Ellis from The Noun Project (dice icon)",
					"jon trillana from The Noun Project (Lego icon)",
					"Patrick N. from The Noun Project (funnel icon)",
					"John Caserta from The Noun Project (trash can icon)",
					"Robert Leonardo from The Noun Project (warning icon)",
					"The Noun Project (picture icon)",
					"Sugar (network 100% icon)"
				] },
				{ title: "music:", names: ["Alphabet song French traditional song play by Finale NotePad"] },
				{ title: "sounds effects:", names: [
					"Art4apps (voices)",
					"Charel Sytze from freesound (applause)",
					"Unchaz from freesound (disappointment)"
				] },
				{ title: "thanks to:", names: ["OLPC France team: Antoine, Jonathan, Laura, Pierre, Sandra, François and others"] }
			]
		};
	}
};

// Filter to choose a theme/collection or a letter for the games
const AbcdFilter = {
	template: `
		<div class="abcd-scrim" @click.self="$emit('close')">
			<div class="filter-popup abcd-popup">
				<div class="filterBox">
					<template v-if="theme == -1">
						<div class="linebreak"></div>
						<abcd-theme v-for="(item, i) in themes" :key="'t' + i" :index="i" :selected="i == selectedTheme" @click="theme = i"></abcd-theme>
						<div class="linebreak"></div>
						<div class="linebreak"></div>
						<abcd-letter v-for="letter in alphabet" :key="letter" :letter="letter" :selected="filter != null && filter.letter == letter" @click="filterOnLetter(letter)"></abcd-letter>
					</template>
					<template v-else>
						<template v-for="(item, i) in collections" :key="'c' + i">
							<abcd-collection v-if="item.theme == theme" :index="i" :selected="filter != null && filter.index == i" @click="filterOnCollection(i)"></abcd-collection>
						</template>
					</template>
				</div>
				<img src="images/trashcan.png" class="standardButton trashButton" @click="$emit('change', null)">
			</div>
		</div>
	`,
	props: { filter: Object },
	emits: ["change", "close"],
	data: function() {
		var alphabet = [];
		for (var i = 0 ; i < 26 ; i++) {
			alphabet.push(String.fromCharCode(97 + i));
		}
		return { theme: -1, themes: Abcd.themes, collections: Abcd.collections, alphabet: alphabet };
	},
	computed: {
		// Theme of the collection used as filter
		selectedTheme: function() {
			return (this.filter != null && this.filter.kind == "Abcd.Collection") ? Abcd.collections[this.filter.index].theme : -1;
		}
	},
	methods: {
		filterOnLetter: function(letter) {
			var entries = Abcd.getLetters()[letter];
			if (!entries || entries.length < Abcd.minFilterEntries) {
				return;
			}
			this.$emit("change", { kind: "Abcd.Letter", letter: letter });
		},

		filterOnCollection: function(index) {
			if (Abcd.collectionEntries(index).length < Abcd.minFilterEntries) {
				return;
			}
			this.$emit("change", { kind: "Abcd.Collection", index: index });
		}
	}
};
