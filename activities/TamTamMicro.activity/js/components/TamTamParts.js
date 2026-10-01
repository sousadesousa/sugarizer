// Sound of an instrument
var firstTimePlayed = true; // HACK for Safari

// Item: an instrument to play
const TamTamItem = {
	template: `
		<div class="item" :id="'app_' + name" :style="{backgroundColor: state.userColor.stroke}">
			<img class="itemImage" :src="image" @click="play">
		</div>
	`,
	props: { name: String },
	data: function() {
		return { state: TamTam.state };
	},
	computed: {
		image: function() {
			return "images/database/" + this.name + (this.state.currentPiano === this.name ? "sel" : "") + ".png";
		}
	},
	methods: {
		// Select the instrument and play it
		play: function() {
			this.state.currentPiano = this.name;
			this.state.currentSimon = this.name;
			var sound = "audio/database/" + this.name + ".mp3";
			if (firstTimePlayed) { // HACK: First time should be different on Safari
				firstTimePlayed = false;
				TamTam.tonePlayer.load(sound, function() {
					TamTam.tonePlayer.play(0);
				});
			} else { // HACK: Only this sequence works on Safari
				TamTam.tonePlayer.playSound(sound);
				TamTam.tonePlayer.play(0);
			}
		}
	}
};

// Collection of instruments
const TamTamCollection = {
	template: `
		<div class="collection">
			<img class="collectionImage" :src="image">
		</div>
	`,
	props: { name: String, selection: Boolean },
	data: function() {
		return { state: TamTam.state };
	},
	computed: {
		image: function() {
			return "images/database/" + this.name + (this.selection || this.state.currentPiano === this.name ? "sel" : "") + ".png";
		}
	}
};

// Piano mode: a keyboard to play the notes of the instrument
const TamTamPiano = {
	template: `
		<div class="container" id="piano-container">
			<ul>
				<li v-for="(key, i) in keys" :key="key.note" :class="['standard', key.color]" @click="play(key.note)">
					<span class="number">{{ i + 1 }}</span>
				</li>
			</ul>
			<ul class="blackkeys">
				<li v-for="(note, i) in blackKeys" :key="i" class="black" :class="{hidden: note === null}" @click="note !== null && play(note)"></li>
			</ul>
		</div>
	`,
	data: function() {
		return {
			state: TamTam.state,
			keys: [
				{ note: "C", color: "red" }, { note: "D", color: "orange" }, { note: "E", color: "yellow" },
				{ note: "F", color: "green" }, { note: "G", color: "aquamarine" }, { note: "A", color: "blue" },
				{ note: "B", color: "purple" }
			],
			blackKeys: ["C#", "D#", null, "F#", "G#", "A#"]
		};
	},
	created: function() {
		this.pitches = { "C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11 };
		this.onKeydown = this.onKeydown.bind(this);
		document.addEventListener("keydown", this.onKeydown, false);
		TamTam.tonePlayer.load("audio/database/" + this.state.currentPiano + ".mp3");
	},
	beforeUnmount: function() {
		document.removeEventListener("keydown", this.onKeydown, false);
	},
	methods: {
		play: function(note) {
			TamTam.tonePlayer.play(this.pitches[note]);
		},

		// Keys 1 to 7 play the notes, with ctrl the sharp ones
		onKeydown: function(event) {
			var keyMap = { "1": "C", "2": "D", "3": "E", "4": "F", "5": "G", "6": "A", "7": "B" };
			if (event.repeat || !keyMap[event.key]) {
				return;
			}
			var note = keyMap[event.key];
			if (event.ctrlKey) {
				if ("12456".includes(event.key)) {
					note += "#";
				} else if (event.key == "3") {
					note = "F";
				} else {
					return;
				}
			}
			this.play(note);
		}
	}
};

// Simon mode: repeat the sequence of colors
const TamTamSimon = {
	template: `
		<div>
			<div class="Simon-info">
				<div id="SimonLevel" class="Simon-level">{{ levelText }}</div>
				<div id="SimonScroe" class="Simon-scroe">{{ scoreText }}</div>
			</div>
			<div class="Simon" id="Simon-board">
				<div class="Simon-game">
					<div v-for="color in colors" :key="color" :id="color" class="Simon-button" :class="[color.toLowerCase(), {disableElement: disabled, darkenElement: dark == color}]" @click="play(color)"></div>
					<div class="Simon-centre Simon-centre-black">
						<div class="Simon-centre Simon-centre-white">
							<div id="SimonStart" class="Simon-start" :class="[startClass, {disableElement: startDisabled}]" @click="startGame">{{ startLabel }}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`,
	props: { strings: Object },
	data: function() {
		return {
			state: TamTam.state,
			colors: ["Red", "Green", "Yellow", "Blue"],
			level: 1,
			score: 0,
			// Colors to repeat and colors played by the user
			correctSequence: [],
			userSequence: [],
			keysEnabled: false,
			disabled: true,
			startDisabled: false,
			// Color highlighted
			dark: null,
			// Text of the center: null for the start message
			startText: null,
			// "", "rightGreen" or "wrongRed"
			startClass: ""
		};
	},
	computed: {
		levelText: function() {
			return this.message("SimonLevelMsg") + " : " + this.level;
		},
		scoreText: function() {
			return this.message("SimonScoreMsg") + " : " + this.score;
		},
		startLabel: function() {
			return this.startText === null ? this.message("SimonStartMsg") : this.startText;
		}
	},
	created: function() {
		this.timeouts = [];
		this.onKeydown = this.onKeydown.bind(this);
		document.addEventListener("keydown", this.onKeydown, false);
		TamTam.tonePlayer.load("audio/database/" + this.state.currentSimon + ".mp3");
	},
	beforeUnmount: function() {
		this.timeouts.forEach(function(id) {
			clearTimeout(id);
		});
		document.removeEventListener("keydown", this.onKeydown, false);
	},
	methods: {
		message: function(key) {
			return (this.strings && this.strings[key]) || "";
		},

		later: function(callback, delay) {
			this.timeouts.push(setTimeout(callback.bind(this), delay));
		},

		onKeydown: function(event) {
			var keyColor = { ArrowUp: "Red", ArrowDown: "Blue", ArrowRight: "Green", ArrowLeft: "Yellow" };
			if (this.keysEnabled && !event.repeat && keyColor[event.key]) {
				this.play(keyColor[event.key]);
			}
		},

		// The user plays a color
		play: function(color) {
			this.clickColor(color);
			this.userSequence.push(color);
			this.startText = this.userSequence.length;
			var position = this.userSequence.length - 1;
			var correct = this.userSequence[position] === this.correctSequence[position];
			if (!correct) {
				this.correctSequence = [];
				this.userSequence = [];
				this.level = 1;
				this.keysEnabled = false;
				this.startText = this.message("SimonWrongMsg");
				this.startClass = "wrongRed";
				this.disabled = true;
				this.later(function() {
					this.startDisabled = false;
					this.startClass = "";
					this.startText = this.message("SimonPlayAgain");
				}, 2000);
			} else if (this.correctSequence.length === this.userSequence.length) {
				// n points for nth step in a level
				this.score += this.level * (this.level + 1) / 2;
				this.userSequence = [];
				this.level++;
				this.keysEnabled = false;
				this.startText = this.message("SimonRightMsg");
				this.startClass = "rightGreen";
				this.disabled = true;
				this.later(this.startGame, 2000);
			}
		},

		// Highlight a color and play its note
		clickColor: function(color, delay) {
			var notes = { Red: "A", Green: "E", Blue: "E", Yellow: "C-s" };
			var pitches = { "C-s": 1, "E": 4, "A": 9 };
			this.dark = color;
			this.later(function() {
				if (this.dark == color) {
					this.dark = null;
				}
			}, delay ? delay - 100 : 1000);
			TamTam.tonePlayer.play(pitches[notes[color]]);
		},

		// Play the sequence to repeat, with a new color at the end
		startGame: function() {
			if (this.level === 1) {
				this.score = 0;
			}
			this.startText = " ";
			this.keysEnabled = false;
			this.startDisabled = true;
			this.disabled = true;
			this.correctSequence.push(this.colors[Math.floor(Math.random() * 4)]);
			var delay = 1000;
			var step = 1500 - this.level * 50;
			for (var steps = 0 ; steps < this.level ; steps++) {
				this.later((function(steps) {
					return function() {
						this.startClass = "";
						this.clickColor(this.correctSequence[steps], step);
						this.startText = steps + 1;
					};
				})(steps), delay);
				delay += step;
			}
			this.later(function() {
				this.disabled = false;
				this.keysEnabled = true;
				this.startText = "";
			}, delay);
		}
	}
};
