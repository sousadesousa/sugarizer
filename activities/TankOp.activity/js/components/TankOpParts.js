// Home screen: choose a mission and start
const TankOpHome = {
	template: `
		<div class="home">
			<img class="home-image no-select-content" src="images/home.png">

			<div class="start-button" @click="$emit('play')">
				<img id="app_start" class="start-button-image no-select-content" src="images/button.png">
				<div class="start-button-text no-select-content">{{ text('Start') }}</div>
			</div>

			<img id="app_credit" class="credit-button no-select-content" src="images/credit.png" @click="showCredits = true">
			<tankop-credits v-if="showCredits" :strings="strings" @close="showCredits = false"></tankop-credits>

			<div id="app_missions" class="mission-description no-select-content">
				<div>
					<div class="mission-header mission-line">{{ text('NextMission') }}</div>
					<div class="mission-dot mission-line">:</div>
				</div>
				<div class="go-arrow go-left mission-line" @click="previousMission"></div>
				<div class="mission-text mission-line">{{ name }}</div>
				<div class="go-arrow go-right mission-line" @click="nextMission"></div>
			</div>

			<div id="app_completed" class="mission-status no-select-content">
				<div>
					<div class="mission-header mission-line">{{ text('Completed') }}</div>
					<div class="mission-dot mission-line">:</div>
				</div>
				<div>
					<div v-for="(completed, i) in state.completed" :key="i" class="mission mission-line" :class="completed ? 'mission-completed' : 'mission-tocomplete'"></div>
				</div>
			</div>
		</div>
	`,
	emits: ["play"],
	props: { strings: Object },
	data: function() {
		return { state: TankOp.state, showCredits: false };
	},
	computed: {
		name: function() {
			return this.text(TankOp.levels[this.state.currentLevel].id);
		}
	},
	methods: {
		text: function(key) {
			return (this.strings && this.strings[key]) || "";
		},

		// Select mission
		previousMission: function() {
			var count = TankOp.levels.length;
			this.state.currentLevel = (this.state.currentLevel + count - 1) % count;
		},

		nextMission: function() {
			this.state.currentLevel = (this.state.currentLevel + 1) % TankOp.levels.length;
		}
	}
};

// Credits popup
const TankOpCredits = {
	template: `
		<div class="tankop-scrim" @click.self="$emit('close')">
			<div class="credits-popup">
				<div class="credit-content no-select-content">
					<img src="images/hq_blue.png" class="credit-image-hq">
					<img src="images/target.png" class="credit-image-target">
					<img src="images/tank_red_0.png" class="credit-image-tankred">
					<div class="credit-title">{{ text('CaC') }}</div>
					<div class="credit-name">Lionel Laské</div>
					<img src="images/tank_blue_2.png" class="credit-image-tank">
					<div class="credit-title">{{ text('Arts') }}</div>
					<div class="credit-name">{{ text('Vicki') }}</div>
					<div class="credit-name">{{ text('Tux') }}</div>
					<div class="credit-name">{{ text('Mister') }}</div>
					<div class="credit-name">{{ text('None') }}</div>
					<img src="images/helo_blue_2.png" class="credit-image-helo">
					<div class="credit-title">{{ text('Music') }}</div>
					<div class="credit-name">{{ text('Valkyries') }}</div>
					<img src="images/soldier_blue_2.png" class="credit-image-soldier">
					<div class="credit-title">{{ text('Sounds') }}</div>
					<div class="credit-name">{{ text('Fridobeck') }}</div>
					<div class="credit-name">{{ text('Joshfeed') }}</div>
					<div class="credit-name">{{ text('Danipenet') }}</div>
					<div class="credit-name">{{ text('Juskiddink') }}</div>
				</div>
			</div>
		</div>
	`,
	emits: ["close"],
	props: { strings: Object },
	methods: {
		text: function(key) {
			return (this.strings && this.strings[key]) || "";
		}
	}
};

// LCD display of some digits
const TankOpLcd = {
	template: `
		<div class="lcd-border" :style="{width: digitWidth * size + 'px', height: digitHeight + 'px'}">
			<div class="lcd-num" :class="'lcd-image-' + digit(i)" v-for="i in size" :key="i"></div>
		</div>
	`,
	props: { size: { type: Number, default: 3 }, value: { type: String, default: "" } },
	data: function() {
		var small = window.innerWidth <= 480;
		return { digitWidth: small ? 20 : 30, digitHeight: small ? 32 : 48 };
	},
	methods: {
		// Matching class of the digit i, the value is aligned to the right
		digit: function(i) {
			var padded = " ".repeat(Math.max(0, this.size - this.value.length)) + this.value;
			var digit = padded[i - 1];
			if (digit >= "0" && digit <= "9") return digit;
			return digit == "-" ? "dash" : "empty";
		}
	}
};

// Play screen: destroy the enemies by giving the result of their operation
const TankOpPlay = {
	template: `
		<div class="board" id="play">
			<div ref="gamebox" class="game-box" :style="{maxHeight: zoom * area.height + 'px'}" @click="gameClick">
				<canvas ref="canvas" id="acanvas" :width="area.width" :height="area.height" :style="{zoom: zoom}"></canvas>
			</div>

			<div class="status-line">
				<div class="wave-text no-select-content">{{ text('Wave') }}</div>
				<div id="play_wave" class="wave-value no-select-content">{{ wave }}</div>
				<div class="score-text no-select-content">{{ text('Score') }}</div>
				<div id="play_score" class="score-value no-select-content">{{ score }}</div>
			</div>

			<img id="play_home" class="home-button no-select-content" src="images/gohome.png" @click.stop="goHome">

			<div id="play_keyboard" ref="keyboard" class="keyboard-set no-select-content">
				<div class="display-line">
					<tankop-lcd class="lcd-value" :size="3" :value="lcd"></tankop-lcd>
				</div>
				<div v-for="(row, r) in rows" :key="r" :class="r == 0 ? 'keyboard-line' : 'keyboard_line'">
					<img v-for="key in row" :key="key" :id="'play_key_' + key" class="keyboard" :src="'images/key_' + key + '.svg'" @click.stop="virtualKey(key)">
				</div>
			</div>
		</div>
	`,
	props: { level: { type: Number, default: 0 }, strings: Object },
	emits: ["home"],
	data: function() {
		return {
			area: { width: constant.areaWidth, height: constant.areaHeight },
			zoom: Math.min(Math.max(document.body.clientWidth / 1000, 0.3), 1),
			// Digits entered on the LCD display
			lcd: "",
			wave: "0001",
			score: "0000",
			rows: [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["0", "fire"]]
		};
	},
	created: function() {
		this.waitForClick = false;
		this.game = new TankOp.Game(this.level, {
			explode: this.explode.bind(this),
			sound: function(sound) {
				TankOp.sound.play(sound);
			}
		});
		this.onKeydown = this.keyDown.bind(this);
		window.addEventListener("keydown", this.onKeydown);
	},
	mounted: function() {
		this.ctx = this.$refs.canvas.getContext("2d");
		var that = this;
		TankOp.loadImages(function() {
			that.loopTimer = window.setInterval(that.gameLoopTick, constant.loopInterval);
			that.gameLoopTick();
		});
	},
	beforeUnmount: function() {
		window.clearInterval(this.loopTimer);
		window.removeEventListener("keydown", this.onKeydown);
		(this.explosions || []).forEach(function(timer) {
			window.clearInterval(timer);
		});
	},
	methods: {
		text: function(key) {
			return (this.strings && this.strings[key]) || "";
		},

		// The size of the board depends on the space left by the keyboard
		resize: function() {
			var keyboardWidth = parseInt(window.getComputedStyle(this.$refs.keyboard).width) || 0;
			var ratio = (document.body.clientWidth - keyboardWidth) / 1000;
			this.zoom = Math.min(Math.max(ratio, 0.3), 1);
		},

		// Tick for game loop
		gameLoopTick: function() {
			var game = this.game;
			game.tick();
			this.resize();
			game.draw(this.ctx);

			// Play the sound of the end of the game once
			if (game.endOfGame && !this.waitForClick) {
				TankOp.sound.play(game.win ? "audio/mission_completed" : "audio/mission_failed", true);
				this.waitForClick = true;
			}

			// HACK: On Android, force redraw of canvas
			var canvas = this.$refs.canvas;
			if (/android/i.test(navigator.userAgent) && document.location.protocol.substr(0, 4) != "http") {
				canvas.style.display = "none";
				canvas.offsetHeight;
				canvas.style.display = "block";
			}
			this.wave = String("0000" + game.wave).slice(-4);
			this.score = String("0000" + game.score).slice(-4);
		},

		// Explosion animation on a unit
		explode: function(position) {
			var that = this;
			var index = 0;
			TankOp.sound.play("audio/explosion");
			this.explosions = this.explosions || [];
			var timer = window.setInterval(function() {
				if (index == TankOp.Game.explosionsImages.length) {
					window.clearInterval(timer);
					return;
				}
				// HACK: Don't do on Android because it flash the screen
				if (!/android/i.test(navigator.userAgent) || document.location.protocol.substr(0, 4) == "http") {
					var ctx = that.ctx;
					ctx.save();
					ctx.translate(position.x * constant.tileSize, position.y * constant.tileSize);
					ctx.drawImage(TankOp.images[TankOp.Game.explosionsImages[index]], 0, 0);
					ctx.restore();
				}
				index++;
			}, constant.explosionInterval);
			this.explosions.push(timer);
		},

		// A key of the keyboard: digits enter the LCD display, dash the negative sign, space fires
		keyDown: function(event) {
			if (event.ctrlKey || event.altKey || event.metaKey) {
				return;
			}
			if (event.key >= "0" && event.key <= "9" && event.key.length == 1) {
				this.digit(event.key);
			} else if (event.key == "-") {
				this.dash();
			} else if (event.key == " ") {
				event.preventDefault();
				this.fire();
			}
		},

		virtualKey: function(key) {
			if (key == "fire") {
				this.fire();
			} else {
				this.digit(key);
			}
		},

		digit: function(digit) {
			if (this.game.endOfGame) {
				return;
			}
			var value = this.lcd;
			if (value.length == 3) {
				value = value.substr(1);
			}
			this.lcd = value + digit;
		},

		dash: function() {
			if (!this.game.endOfGame) {
				this.lcd = "-";
			}
		},

		// Fire on the units with the value of the LCD display
		fire: function() {
			if (this.game.endOfGame) {
				return;
			}
			this.game.fire(this.lcd.replace(/ /g, ""));
			this.lcd = "";
		},

		goHome: function() {
			// Click at the end of game
			if (this.waitForClick) {
				this.endMission();
				return;
			}
			window.clearInterval(this.loopTimer);
			this.$emit("home", false);
		},

		// End of the mission: back home, and the mission is completed if won
		endMission: function() {
			window.clearInterval(this.loopTimer);
			TankOp.sound.pause();
			this.$emit("home", this.game.win);
		},

		// A tap occurs on the game: at the end of the game quit, else move the target or fire
		gameClick: function(event) {
			var game = this.game;
			if (game.endOfGame) {
				this.endMission();
				return;
			}

			// Compute direction: the center of the screen is the fire zone
			var center_x = Math.floor(document.documentElement.clientWidth / 2.0);
			var center_y = Math.floor((document.documentElement.clientHeight + constant.pubHeight) / 2.0);
			var diffx = event.clientX - center_x, diffy = event.clientY - center_y;
			var absdiffx = Math.abs(diffx);
			var absdiffy = Math.abs(diffy);
			if (absdiffx < constant.fireZoneWidth && absdiffy < constant.fireZoneHeight) {
				game.fireOnTarget();
			} else if (absdiffx > absdiffy) {
				game.moveTarget(diffx > 0 ? 1 : -1, 0);
			} else {
				game.moveTarget(0, diffy > 0 ? 1 : -1);
			}
		}
	}
};
