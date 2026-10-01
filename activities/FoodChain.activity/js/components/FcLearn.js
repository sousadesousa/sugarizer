// Learn game: put each card in the box of the food it eats
const FcLearn = {
	mixins: [FcTimerMixin],
	template: `
		<div class="board" id="learnGame">
			<div id="learnGame_cards">
				<fc-status :level="level" :time="timeText" :overtime="overtime"></fc-status>

				<div id="learnGame_startbox" class="start-box" :class="{'box-dragging': dragging}">
					<fc-card v-if="card && placed === -1" id="learnGame_card" :cardname="card.cardname" :x="10" :y="10" :dragged="selected || dragging" :draggable="!timerPaused" v-show="!hidden" @click="taped" @dragstart="dragstart" @dragend="dragfinish"></fc-card>
				</div>
				<div>
					<div v-for="(box, i) in boxes" :key="box.name" :id="'learnGame_' + box.name" class="end-box" :class="[box.class + '-box-' + (size == 2 ? 'two' : 'three'), {'box-dragging': dragging, 'box-win': result == 'win' && placed === i, 'box-lost': result == 'lost' && placed === i}]" v-show="i < size" @click="chooseAsEnd(i)" @dragover="dragover" @drop="drop($event, i)">
						<div class="box-name" :class="{'herb-color': i == 0}">{{ text(box.strategy) }}</div>
						<fc-card v-if="card && placed === i" :cardname="card.cardname" :x="5" :y="0"></fc-card>
					</div>
				</div>

				<fc-shadow-button v-show="showPlay" id="learnGame_play" img="play" class="play" @click="play"></fc-shadow-button>
				<fc-shadow-button v-show="showPause" id="learnGame_pause" img="pause" class="play" @click="pause"></fc-shadow-button>
				<fc-shadow-button v-show="showForward" id="learnGame_forward" img="forward" class="restart" @click="next"></fc-shadow-button>
				<fc-shadow-button v-show="showHome" id="learnGame_home" img="home" class="home" @click="home"></fc-shadow-button>
			</div>
		</div>
	`,
	props: { startLevel: { type: Number, default: 1 } },
	emits: ["home"],
	data: function() {
		return {
			level: this.startLevel,
			cardlist: null,
			currentcard: 0,
			boxes: [
				{ name: "herbbox", class: "herb", strategy: "herbivore" },
				{ name: "carnbox", class: "carn", strategy: "carnivore" },
				{ name: "omnibox", class: "omni", strategy: "omnivore" }
			],
			// Box containing the card: -1 for the start box, else the index of the box
			placed: -1,
			// "win", "lost" or "" for the card placed in a box
			result: "",
			selected: false,
			dragging: false,
			hidden: false,
			showPlay: false,
			showPause: true,
			showForward: false,
			showHome: false,
			// What to do when the sound ends: 0 start the timer, 1 next card, 2 card back to the start
			nextaction: 0,
			userPaused: false
		};
	},
	computed: {
		config: function() {
			return FoodChain.learnLevels[this.level - 1];
		},
		size: function() {
			return this.config.size;
		},
		card: function() {
			return this.cardlist ? this.cardlist[this.currentcard] : null;
		}
	},
	created: function() {
		this.state.game = "LearnGame";
		this.onSoundEnd = this.endSound.bind(this);
		FoodChain.sound.on(this.onSoundEnd);
		this.levelChanged();
		this.startTimer();
	},
	beforeUnmount: function() {
		FoodChain.sound.off(this.onSoundEnd);
	},
	methods: {
		text: function(key) {
			return FoodChain.text(key);
		},

		tick: function() {
			if (!this.timerPaused) {
				this.updateTime(this.config.time);
			}
		},

		// Level changed, init board then start game
		levelChanged: function() {
			this.state.level = this.level;
			this.placed = -1;
			this.result = "";
			this.selected = false;
			this.dragging = false;
			this.hidden = false;
			this.nextaction = 0;
			this.userPaused = false;
			this.cardlist = FoodChain.randomFeedList(this.config.size, this.config.count);
			this.currentcard = 0;
			this.timerPaused = true;
			FoodChain.sound.play(FoodChain.cardSound(this.card.cardname));
			FoodChain.saveContext();

			this.showPlay = false;
			this.showPause = true;
			this.showForward = false;
			this.showHome = false;
			this.resetTime();
		},

		// Sound ended: go on with the game
		endSound: function() {
			// Right play, next card or next level
			if (this.nextaction == 1) {
				this.nextaction = 0;
				this.result = "";
				if (this.currentcard + 1 == this.cardlist.length) {
					this.computeLevelScore();
					this.placed = -2;
					this.showPlay = false;
					this.showPause = false;
					this.showHome = true;
					this.showForward = this.level != FoodChain.learnLevels.length;
				} else {
					this.currentcard++;
					this.placed = -1;
					FoodChain.sound.play(FoodChain.cardSound(this.card.cardname));
				}
				return;
			}

			// Bad play, put the card at start
			if (this.nextaction == 2) {
				this.nextaction = 0;
				this.result = "";
				this.placed = -1;
			}

			// Start timer, except if the user paused the game
			this.timerPaused = this.userPaused;
		},

		// Play sound when card taped, set card as selected (avoid need of drag&drop)
		taped: function(event) {
			event.stopPropagation();
			if (this.timerPaused) {
				return;
			}
			FoodChain.sound.play(FoodChain.cardSound(this.card.cardname));
			this.selected = true;
		},

		dragstart: function(event) {
			if (this.timerPaused) {
				event.preventDefault();
				return;
			}
			event.dataTransfer.setData("text/plain", this.card.cardname);
			event.dataTransfer.effectAllowed = "move";
			this.dragging = true;
			FoodChain.sound.play(FoodChain.cardSound(this.card.cardname));
			this.selected = false;
		},

		dragfinish: function() {
			this.dragging = false;
		},

		// Drag over a box, allow dropping
		dragover: function(event) {
			if (this.dragging) {
				event.preventDefault();
			}
		},

		// Choose the final box for the card, same as drop but without drag
		chooseAsEnd: function(box) {
			if (!this.selected) {
				return;
			}
			this.selected = false;
			this.place(box);
		},

		drop: function(event, box) {
			if (!this.dragging) {
				return;
			}
			event.preventDefault();
			this.dragging = false;
			this.place(box);
		},

		// Put the card in a box and check if it is the right one
		place: function(box) {
			if (this.timerPaused || this.placed !== -1) {
				return;
			}
			this.placed = box;
			this.timerPaused = true;
			if (box == this.card.strategy) {
				this.nextaction = 1;
				this.addScore(1);
				FoodChain.sound.play("audio/applause");
				this.result = "win";
			} else {
				this.nextaction = 2;
				FoodChain.sound.play("audio/disappointed");
				this.result = "lost";
			}
		},

		// Score for this level: the time left
		computeLevelScore: function() {
			var seconds = this.seconds();
			if (seconds < this.config.time) {
				this.addScore(this.config.time - seconds);
			}
		},

		// Resume game
		play: function() {
			this.hidden = false;
			this.userPaused = false;
			this.timerPaused = false;
			this.showPlay = false;
			this.showPause = true;
			this.showHome = false;
		},

		// Pause game: the card is hidden
		pause: function() {
			this.hidden = true;
			this.userPaused = true;
			this.timerPaused = true;
			this.showPause = false;
			this.showPlay = true;
			this.showHome = true;
		},

		next: function() {
			this.level++;
			this.levelChanged();
		},

		home: function() {
			this.$emit("home");
		}
	}
};
