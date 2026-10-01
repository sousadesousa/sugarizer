// Build game: put the cards of a food chain in the right order
const FcBuild = {
	mixins: [FcTimerMixin],
	template: `
		<div class="board" id="buildGame">
			<div id="buildGame_cards">
				<fc-status :level="level" :time="timeText" :overtime="overtime"></fc-status>

				<div id="buildGame_gamebox" class="box" :class="[{'box-dragging': dragging}, result ? 'box-' + result : '']" @click="unselect" @dragover="dragover" @drop="drop">
					<fc-card v-for="(card, i) in cards" :key="card.name" v-show="!hidden && card.shown" :cardname="card.name" :x="card.x" :y="card.y" :z="card.z" :dragged="selected === i || (dragging && dragged === i)" draggable="true" @click="taped(i, $event)" @dragstart="dragstart(i, $event)" @dragend="dragging = false"></fc-card>
				</div>

				<fc-shadow-button v-show="showValidate" id="buildGame_validate" img="validate" class="validate" @click="controlOrder"></fc-shadow-button>
				<fc-shadow-button v-show="showPlay" id="buildGame_play" img="play" class="play" @click="play"></fc-shadow-button>
				<fc-shadow-button v-show="showPause" id="buildGame_pause" img="pause" class="play" @click="pause"></fc-shadow-button>
				<fc-shadow-button v-show="showRestart" id="buildGame_restart" img="restart" class="restart" @click="restart"></fc-shadow-button>
				<fc-shadow-button v-show="showForward" id="buildGame_forward" img="forward" class="restart" @click="next"></fc-shadow-button>
				<fc-shadow-button v-show="showHome" id="buildGame_home" img="home" class="home" @click="home"></fc-shadow-button>
			</div>
		</div>
	`,
	props: { startLevel: { type: Number, default: 1 } },
	emits: ["home"],
	data: function() {
		return {
			level: this.startLevel,
			// Cards of the board: name, position (x in % of the board or px, y in px), z index and shown
			cards: [],
			selected: null,
			dragging: false,
			dragged: null,
			hidden: false,
			// "win", "lost" or ""
			result: "",
			showValidate: true,
			showPlay: false,
			showPause: true,
			showRestart: false,
			showForward: false,
			showHome: false,
			userPaused: false
		};
	},
	computed: {
		config: function() {
			return FoodChain.buildLevels[this.level - 1];
		}
	},
	created: function() {
		this.state.game = "BuildGame";
		this.previous = null;
		this.mixed = null;
		this.onSoundEnd = this.endSound.bind(this);
		FoodChain.sound.on(this.onSoundEnd);
		this.levelChanged();
		this.startTimer();
	},
	beforeUnmount: function() {
		FoodChain.sound.off(this.onSoundEnd);
	},
	methods: {
		tick: function() {
			if (!this.timerPaused) {
				this.updateTime(this.config.time);
			}
		},

		// Level changed, init board then start game
		levelChanged: function() {
			this.state.level = this.level;

			// Compute the start chain, not the same as the previous one
			if (this.mixed == null) {
				var same;
				do {
					this.chain = FoodChain.randomChain(this.config.size);
					same = this.previous != null && this.previous.length == this.chain.length && this.previous.every(function(name, i) {
						return name == this.chain[i];
					}, this);
				} while (same);
				this.mixed = FoodChain.mix(this.chain);
			}

			// Display cards, only the first one: the next ones come when sounds end
			var step = 99 / this.mixed.length;
			var x = 5 - this.mixed.length;
			this.cards = this.mixed.map(function(name, i) {
				var card = { name: name, x: x + "%", y: 8, z: 0, shown: i == 0 };
				x += step;
				return card;
			});
			this.reveal = 0;
			FoodChain.sound.play(FoodChain.cardSound(this.cards[0].name));

			this.selected = null;
			this.dragging = false;
			this.hidden = false;
			this.result = "";
			this.zmax = 0;
			this.userPaused = false;
			FoodChain.saveContext();

			this.showValidate = true;
			this.showPlay = false;
			this.showPause = true;
			this.showRestart = false;
			this.showForward = false;
			this.showHome = false;
			this.resetTime();
			this.timerPaused = true;
		},

		// Sound ended, show and play next card if any
		endSound: function(sound) {
			if (this.reveal === null || this.reveal >= this.cards.length) {
				return;
			}
			if (!FoodChain.soundMatch(FoodChain.cardSound(this.cards[this.reveal].name), sound)) {
				return;
			}
			this.reveal++;
			if (this.reveal < this.cards.length) {
				this.cards[this.reveal].shown = true;
				FoodChain.sound.play(FoodChain.cardSound(this.cards[this.reveal].name));
				return;
			}
			// All cards displayed, start timer
			this.reveal = null;
			this.timerPaused = this.userPaused;
		},

		// Set the card to top of the stack
		toTop: function(i) {
			this.cards[i].z = ++this.zmax;
		},

		// Use selection to avoid drag&drop: select a card, then another to swap them
		taped: function(i, event) {
			event.stopPropagation();
			if (this.timerPaused) {
				return;
			}
			if (this.selected === null) {
				this.selected = i;
				FoodChain.sound.play(FoodChain.cardSound(this.cards[i].name));
				this.toTop(i);
			} else if (this.selected !== i) {
				var first = this.cards[this.selected], second = this.cards[i];
				var x = first.x, y = first.y;
				first.x = second.x;
				first.y = second.y;
				second.x = x;
				second.y = y;
				this.selected = null;
			}
		},

		// Tap on the board unselect current card
		unselect: function() {
			this.selected = null;
		},

		dragstart: function(i, event) {
			if (this.timerPaused) {
				event.preventDefault();
				return;
			}
			event.dataTransfer.setData("text/plain", this.cards[i].name);
			event.dataTransfer.effectAllowed = "move";
			this.dragging = true;
			this.dragged = i;
			this.dragy = event.clientY - this.cards[i].y;
			FoodChain.sound.play(FoodChain.cardSound(this.cards[i].name));
			this.selected = null;
			this.toTop(i);
		},

		dragover: function(event) {
			if (this.dragging) {
				event.preventDefault();
			}
		},

		// Dropped in the board: move the card
		drop: function(event) {
			if (!this.dragging || this.timerPaused) {
				return;
			}
			event.preventDefault();
			var card = this.cards[this.dragged];
			card.x = (event.clientX / window.innerWidth) * 100 + "%";
			card.y = event.clientY - this.dragy;
			this.dragging = false;
		},

		// Validate cards order
		controlOrder: function() {
			this.timerPaused = true;
			this.showPlay = false;
			this.showPause = false;
			this.showValidate = false;

			// Sort using x card position
			var cards = this.cards.slice().sort(function(c1, c2) {
				return parseFloat(c1.x) - parseFloat(c2.x);
			});
			var win = this.chain.every(function(name, i) {
				return cards[i].name == name;
			});
			if (win) {
				FoodChain.sound.play("audio/applause");
				this.result = "win";
				this.computeScore();
				this.showHome = true;
				this.showForward = this.level != FoodChain.buildLevels.length;
			} else {
				FoodChain.sound.play("audio/disappointed");
				this.result = "lost";
				this.showHome = true;
				this.showRestart = true;
			}
		},

		// Score: 10 and the time left
		computeScore: function() {
			var score = 10;
			var seconds = this.seconds();
			if (seconds < this.config.time) {
				score += this.config.time - seconds;
			}
			this.addScore(score);
		},

		play: function() {
			this.hidden = false;
			this.userPaused = false;
			this.timerPaused = false;
			this.showPlay = false;
			this.showPause = true;
			this.showHome = false;
		},

		// Pause the game: the cards are hidden
		pause: function() {
			this.hidden = true;
			this.userPaused = true;
			this.timerPaused = true;
			this.showPause = false;
			this.showPlay = true;
			this.showHome = true;
		},

		restart: function() {
			this.levelChanged();
		},

		next: function() {
			this.level++;
			this.previous = this.chain;
			this.mixed = null;
			this.levelChanged();
		},

		home: function() {
			this.$emit("home");
		}
	}
};
