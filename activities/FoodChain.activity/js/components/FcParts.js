// Parts shared by the screens

// Button with an image and a shadow shown when the pointer is over it
const FcShadowButton = {
	template: `
		<div class="shadowbutton-container" @mouseenter="shadow = true" @mouseleave="shadow = false">
			<img :id="id + '_button'" class="shadowbutton shadowbutton-image" :src="'images/' + img + '.svg'">
			<img v-show="shadow" class="shadowbutton-shadow shadowbutton-image" :src="'images/' + img + '_shadow.svg'">
		</div>
	`,
	props: { id: String, img: String },
	data: function() {
		return { shadow: false };
	}
};

// Level, score and time of a game
const FcStatus = {
	template: `
		<div :class="{'status-bar': bar}">
			<div class="level-zone">
				<div class="title level-value">{{ text('level') }}</div>
				<div class="title level-value">{{ ' ' + level }}</div>
			</div>
			<div class="score-zone">
				<div class="title score-text">{{ text('score') }}</div>
				<div class="title score-value">{{ score }}</div>
				<div class="title timer-value" :class="{'timer-overtime': overtime}">{{ time }}</div>
			</div>
		</div>
	`,
	props: { level: Number, time: String, overtime: Boolean, bar: Boolean },
	data: function() {
		return { state: FoodChain.state };
	},
	computed: {
		score: function() {
			return FoodChain.formatScore(this.state.score);
		}
	},
	methods: {
		text: function(key) {
			return FoodChain.text(key);
		}
	}
};

// Sound of a card
FoodChain.cardSound = function(cardname) {
	return FoodChain.getDatabase() + "audio/" + FoodChain.text("sounddir") + "/cards/" + cardname;
};

// Card with image, text and sound
const FcCard = {
	template: `
		<div class="card" :class="{'card-dragged': dragged}" :style="{marginLeft: left, marginTop: top, zIndex: z}">
			<img class="cardImage" :src="image" draggable="false">
			<img class="cardSoundIcon" src="images/sound_icon.png" draggable="false">
			<div class="cardText">{{ text }}</div>
		</div>
	`,
	props: {
		cardname: String,
		x: { type: [Number, String], default: 0 },
		y: { type: Number, default: 0 },
		z: { type: Number, default: 0 },
		dragged: Boolean
	},
	computed: {
		image: function() {
			return FoodChain.getDatabase() + "images/cards/" + this.cardname + ".png";
		},
		text: function() {
			return FoodChain.text(this.cardname);
		},
		left: function() {
			return this.x.toString().indexOf("%") != -1 ? this.x : this.x + "px";
		},
		top: function() {
			return this.y + "px";
		}
	}
};

// Shared by the games: time elapsed, paused or not
const FcTimerMixin = {
	data: function() {
		return {
			state: FoodChain.state,
			timecount: { mins: 0, secs: 0, tenth: 0 },
			timerPaused: true,
			overtime: false
		};
	},
	computed: {
		timeText: function() {
			return FoodChain.formatTime(this.timecount);
		}
	},
	methods: {
		// Start the timer, call tick() every interval milliseconds
		startTimer: function(interval) {
			this.timerJob = window.setInterval(this.tick, interval || 100);
		},

		stopTimer: function() {
			window.clearInterval(this.timerJob);
		},

		resetTime: function() {
			this.timecount = { mins: 0, secs: 0, tenth: 0 };
			this.overtime = false;
		},

		// Update the time, limit is the time in seconds after which it is red
		updateTime: function(limit) {
			var time = this.timecount;
			time.tenth++;
			if (time.tenth == 10) {
				time.tenth = 0;
				time.secs++;
				if (time.mins * 60 + time.secs >= limit) {
					this.overtime = true;
				}
				if (time.secs == 60) {
					time.secs = 0;
					time.mins++;
				}
			}
		},

		// Seconds elapsed
		seconds: function() {
			return this.timecount.mins * 60 + this.timecount.secs;
		},

		addScore: function(score) {
			this.state.score += score;
		}
	},
	beforeUnmount: function() {
		this.stopTimer();
	}
};
