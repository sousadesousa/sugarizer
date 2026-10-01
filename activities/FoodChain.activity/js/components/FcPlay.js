// Play game: the frog eats flies, avoids rocks and snakes
const FcPlay = {
	mixins: [FcTimerMixin],
	template: `
		<div class="board" id="playGame">
			<div id="playGame_cards" class="cards" @click="clickToMove">
				<fc-status bar :level="level" :time="timeText" :overtime="overtime"></fc-status>
				<div id="playGame_lifes" class="life-border">
					<img v-for="i in 3" :key="i" v-show="i <= life" class="life" src="images/frog9.png">
				</div>

				<div ref="gamebox" id="playGame_gamebox" class="game-box" :style="{maxHeight: area.height * zoom + 'px', maxWidth: area.width * zoom + 'px'}">
					<canvas ref="canvas" id="acanvas" :width="area.width" :height="area.height" :style="{zoom: zoom}"></canvas>
				</div>

				<fc-shadow-button v-show="showPlay" id="playGame_play" img="play" class="play" @click.stop="play"></fc-shadow-button>
				<fc-shadow-button v-show="showPause" id="playGame_pause" img="pause" class="play" @click.stop="pause"></fc-shadow-button>
				<fc-shadow-button v-show="showForward" id="playGame_forward" img="forward" class="restart" @click.stop="next"></fc-shadow-button>
				<fc-shadow-button v-show="showHome" id="playGame_home" img="home" class="home2" @click.stop="home"></fc-shadow-button>
			</div>
		</div>
	`,
	props: { startLevel: { type: Number, default: 1 } },
	emits: ["home"],
	data: function() {
		return {
			level: this.startLevel,
			life: 3,
			area: FoodChain.playArea,
			zoom: FoodChain.getZoomLevel(),
			showPlay: false,
			showPause: true,
			showForward: false,
			showHome: false
		};
	},
	computed: {
		config: function() {
			return FoodChain.playLevels[this.level - 1];
		}
	},
	created: function() {
		this.state.game = "PlayGame";
		// Sprites and engines are not reactive: they change at each frame
		this.nextaction = 0;
		this.frog = null;
		this.rocks = [];
		this.flies = [];
		this.snakes = [];
		this.onSoundEnd = this.endSound.bind(this);
		FoodChain.sound.on(this.onSoundEnd);
		this.onKeydown = this.keyDown.bind(this);
		window.addEventListener("keydown", this.onKeydown);
	},
	mounted: function() {
		this.ctx = this.$refs.canvas.getContext("2d");
		var that = this;
		FoodChain.loadImages(this.imageNames(), function() {
			that.levelChanged();
			that.initGame();
			that.startTimer();
			that.monsterJob = window.setInterval(that.monsterEngine, 500);
		});
	},
	beforeUnmount: function() {
		FoodChain.sound.off(this.onSoundEnd);
		window.removeEventListener("keydown", this.onKeydown);
		window.clearInterval(this.monsterJob);
		this.allSprites().forEach(function(sprite) {
			sprite.stop();
		});
	},
	methods: {
		imageNames: function() {
			var names = ["rock", "fly1", "fly2"];
			for (var i = 1 ; i <= 9 ; i++) names.push("frog" + i);
			for (var i = 1 ; i <= 8 ; i++) names.push("snake" + i);
			return names;
		},

		allSprites: function() {
			return [this.frog].concat(this.rocks, this.flies, this.snakes).filter(function(sprite) {
				return sprite;
			});
		},

		tick: function() {
			if (!this.timerPaused) {
				this.updateTime(this.config.time);
			}
		},

		// A random sprite of a kind in the play area
		randomSprite: function(kind, margin, extra) {
			var area = FoodChain.playArea;
			var size = FoodChain.sprites[kind];
			var options = {
				x: margin + Math.floor(Math.random() * (area.width - 300)),
				y: margin + Math.floor(Math.random() * (area.height - 200)),
				heading: Math.floor(Math.random() * 4) * 90,
				width: size.dx,
				height: size.dy
			};
			if (kind == "rock") {
				options.x = 130 + Math.floor(Math.random() * (area.width - 300));
				options.y = 130 + Math.floor(Math.random() * (area.height - 200));
			}
			for (var key in extra) {
				options[key] = extra[key];
			}
			return new FoodChain.Sprite(options);
		},

		// Level changed, init board then start game
		levelChanged: function() {
			this.state.level = this.level;
			var area = FoodChain.playArea;
			this.allSprites().forEach(function(sprite) {
				sprite.stop();
			});

			// Init frog
			this.frog = new FoodChain.Sprite({
				x: 70, y: (area.height / 2) - 20, heading: 0,
				images: ["frog1", "frog2", "frog3", "frog4", "frog5", "frog6", "frog7", "frog8", "frog9"],
				width: FoodChain.sprites.frog.dx, height: FoodChain.sprites.frog.dy, index: 0, sound: "audio/frog"
			});
			this.frog.alive = true;
			var that = this;
			var free = function(n, s) {
				return !n.intersect(s);
			};

			// Set randomly rocks, away from each other and from the frog
			this.rocks = [];
			for (var i = 0 ; i < this.config.rocks ; i++) {
				this.rocks.push(FoodChain.createWithCondition(function() {
					return that.randomSprite("rock", 130, { images: ["rock"], index: 0 });
				}, free, this.rocks.concat(this.frog)));
			}

			// Set randomly flies, not on a rock, on the frog or on other fly
			this.flies = [];
			for (var i = 0 ; i < this.config.flies ; i++) {
				var fly = FoodChain.createWithCondition(function() {
					return that.randomSprite("fly", 100, { images: ["fly1", "fly2"], index: 0, sound: "audio/flies" });
				}, free, this.rocks.concat(this.flies, this.frog));
				fly.alive = true;
				this.flies.push(fly);
			}

			// Create snakes (dead at init)
			this.snakes = [];
			for (var i = 0 ; i < this.config.snakes ; i++) {
				var snake = new FoodChain.Sprite({
					x: 0, y: 0, heading: 0, images: ["snake1", "snake2", "snake3", "snake4", "snake5", "snake6", "snake7", "snake8"],
					width: FoodChain.sprites.snake.dx, height: FoodChain.sprites.snake.dy, index: 0, sound: "audio/snake"
				});
				snake.alive = false;
				snake.spawnedOnce = false;
				this.snakes.push(snake);
			}

			FoodChain.saveContext();
			this.showPlay = false;
			this.showPause = true;
			this.showForward = false;
			this.showHome = false;
			this.resetTime();
			this.timerPaused = true;
		},

		// All images loaded, start displaying game
		initGame: function() {
			var area = FoodChain.playArea;
			this.ctx.clearRect(0, 0, area.width, area.height);
			var ctx = this.ctx;
			this.rocks.forEach(function(rock) {
				rock.draw(ctx);
			});
			this.frog.draw(ctx);
			this.flies.forEach(function(fly) {
				fly.draw(ctx);
			});
			this.timerPaused = false;
		},

		redrawRocks: function() {
			var ctx = this.ctx;
			this.rocks.forEach(function(rock) {
				rock.unDraw(ctx);
				rock.draw(ctx);
			});
		},

		// Show direction to frog using click on board
		clickToMove: function(event) {
			// Position of the mouse in the world coordinates from the viewport coordinates
			var rect = this.$refs.gamebox.getBoundingClientRect();
			var scaleX = FoodChain.playArea.width / rect.width;
			var scaleY = FoodChain.playArea.height / rect.height;
			var dx = (event.clientX - rect.left) * scaleX - this.frog.x;
			var dy = (event.clientY - rect.top) * scaleY - this.frog.y;
			if (dx == 0 && dy == 0) {
				return;
			}
			if (Math.abs(dx) > Math.abs(dy)) {
				dx = dx > 0 ? 1 : -1;
				dy = 0;
			} else {
				dx = 0;
				dy = dy > 0 ? 1 : -1;
			}
			// Simulate the equivalent key direction
			var playKey = FoodChain.playKeys.find(function(key) {
				return key.dx == dx && key.dy == dy;
			});
			this.move(playKey);
		},

		keyDown: function(event) {
			var playKey = FoodChain.playKeys.find(function(key) {
				return key.key == event.key;
			});
			if (playKey) {
				event.preventDefault();
				this.move(playKey);
			} else {
				console.log("key pressed: " + event.key);
			}
		},

		// Move the frog in a direction
		move: function(playKey) {
			if (this.timerPaused || !this.frog || !this.frog.alive) {
				return;
			}
			var frog = this.frog;
			frog.unDraw(this.ctx);
			this.redrawRocks();
			if (playKey.heading != frog.heading) {
				// Just change heading
				frog.heading = playKey.heading;
				frog.firstImage();
			} else {
				frog.animate(this.ctx, [1, 2, 3, 4, 5, 6, 0], playKey.dx * 10, playKey.dy * 10, this.frogEngine.bind(this));
			}
			frog.draw(this.ctx);
		},

		// Frog engine: test collision between frog and other sprites
		frogEngine: function() {
			var frog = this.frog, ctx = this.ctx;

			// Test if collide with a rock
			for (var i = 0 ; i < this.rocks.length ; i++) {
				if (frog.intersect(this.rocks[i])) {
					this.frogDead(this.rocks[i]);
					return false;
				}
			}

			// Test if eat a fly
			for (var i = 0 ; i < this.flies.length ; i++) {
				if (this.flies[i].alive && frog.intersect(this.flies[i])) {
					this.flies[i].unDraw(ctx);
					this.flies[i].alive = false;
					frog.playSound();
					this.addScore(1);
					return !this.testEndOfGame();
				}
			}

			// Test if out of the play board
			var area = FoodChain.playArea;
			if (frog.x <= frog.width / 2 || frog.x >= area.width - frog.width / 2 ||
				frog.y <= frog.height / 2 || frog.y >= area.height - frog.height / 2) {
				// Yes, replace it on the limit
				frog.x = Math.max(frog.width / 2 + 1, frog.x);
				frog.x = Math.min(area.width - frog.width / 2 - 1, frog.x);
				frog.y = Math.max(frog.height / 2 + 1, frog.y);
				frog.y = Math.min(area.height - frog.height / 2 - 1, frog.y);
				frog.unDraw(ctx);
				frog.firstImage();
				frog.draw(ctx);
				frog.playSound();
				return false;
			}

			// Test if collide with a snake
			for (var i = 0 ; i < this.snakes.length ; i++) {
				if (frog.intersect(this.snakes[i])) {
					this.frogDead(this.snakes[i]);
					return false;
				}
			}
			return true;
		},

		// The frog is dead, killed by a rock or a snake
		frogDead: function(killer) {
			this.frog.unDraw(this.ctx);
			this.frog.useImage(7);
			this.frog.draw(this.ctx);
			killer.draw(this.ctx);
			this.frog.alive = false;
			this.testEndOfGame();
		},

		// Periodic engine wake up for flies and snakes
		monsterEngine: function() {
			if (!this.frog) {
				return;
			}
			this.fliesEngine();
			this.snakesEngine();
		},

		// Flies engine: move and animate flies periodically
		fliesEngine: function() {
			if (this.timerPaused) {
				return;
			}
			for (var i = 0 ; i < this.flies.length ; i++) {
				if (!this.flies[i].alive) {
					continue;
				}
				// Randomly decide what to do
				var n = Math.floor(Math.random() * 10);
				if (n == 1) {
					this.moveFly(this.flies[i]);
				} else if (n <= 2) {
					this.flies[i].animate(this.ctx, [0, 1, 0, 1, 0, 1], 0, 0, this.testFlyDead.bind(this));
				}
			}
		},

		// Move the fly due to periodic change or snake collision
		moveFly: function(fly) {
			var that = this;
			var dummy = FoodChain.createWithCondition(function() {
				return that.randomSprite("fly", 100, {});
			}, function(n, s) {
				return s == fly || !n.intersect(s);
			}, this.rocks.concat(this.flies, this.frog, this.snakes));

			fly.unDraw(this.ctx);
			fly.x = dummy.x;
			fly.y = dummy.y;
			fly.heading = dummy.heading;
			fly.draw(this.ctx);
			this.frog.unDraw(this.ctx);
			this.frog.draw(this.ctx);
			fly.playSound();
		},

		// Snake engine: create and animate snake periodically
		snakesEngine: function() {
			if (this.timerPaused) {
				return;
			}
			var area = FoodChain.playArea;
			for (var i = 0 ; i < this.snakes.length ; i++) {
				// Randomly decide what to do
				if (Math.floor(Math.random() * 4) != 0) {
					continue;
				}

				// Snake has end its course
				var snake = this.snakes[i];
				if ((snake.heading == 90 && snake.y + snake.height < 0) || (snake.heading == 270 && snake.y - snake.height / 2 > area.height)) {
					snake.alive = false;
				}

				// Snake out of game, reintroduce it
				if (!snake.alive) {
					// Compute a trajectory free of rocks and snakes. The first time the frog is avoided too
					var toAvoid = this.rocks.concat(this.snakes);
					if (!snake.spawnedOnce) {
						toAvoid = toAvoid.concat(this.frog);
					}
					var freeInterval = [];
					for (var x = 100 ; x < area.width - 300 ; x = x + 50) {
						var free = true;
						for (var j = 0 ; free && j < toAvoid.length ; j++) {
							var s = toAvoid[j];
							if (s == snake) continue;
							if ((x >= s.x && x - snake.width / 2 <= s.x + s.width / 2) || (x <= s.x && x + snake.width / 2 >= s.x - s.width / 2)) {
								free = false;
							}
						}
						if (free) {
							freeInterval.push(x);
						}
					}

					// Nowhere to spawn, skip this attempt
					if (freeInterval.length === 0) {
						continue;
					}

					// Compute the snake position
					snake.x = freeInterval[Math.floor(Math.random() * freeInterval.length)];
					snake.heading = (Math.floor(Math.random() * 2) == 0) ? 90 : 270;
					snake.y = (snake.heading == 90) ? area.height : 0;
					snake.alive = true;
					snake.spawnedOnce = true;
					snake.playSound();
				}

				// Animate it
				var dy = (snake.heading == 90) ? -6 : 6;
				snake.animate(this.ctx, [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7], 0, dy, this.snakeCollisionEngine.bind(this));
			}
		},

		// Snake collision engine
		snakeCollisionEngine: function(snake) {
			// Hit the frog?
			if (snake.intersect(this.frog)) {
				// Already dead
				if (!this.frog.alive) {
					this.frog.draw(this.ctx);
					return true;
				}
				// Frog is dead
				this.frog.alive = false;
				this.frog.unDraw(this.ctx);
				this.frog.useImage(7);
				this.frog.draw(this.ctx);
				this.testEndOfGame();
				return true;
			}

			// Eat a fly?
			for (var i = 0 ; i < this.flies.length ; i++) {
				if (this.flies[i].alive && snake.intersect(this.flies[i])) {
					this.moveFly(this.flies[i]);
					return true;
				}
			}
			return true;
		},

		// Force end of fly animation if fly is dead
		testFlyDead: function(fly) {
			if (!fly.alive) {
				fly.unDraw(this.ctx);
				return false;
			}
			// The frog is redrawn at each frame of the fly animation: no fly can puncture a hole in it
			this.frog.draw(this.ctx);
			return true;
		},

		// Test end of game, return true if the game is ended
		testEndOfGame: function() {
			// Frog is dead
			if (!this.frog.alive) {
				this.life--;
				if (this.life > 0) {
					// Next frog
					this.nextaction = 1;
				} else {
					this.timerPaused = true;
					this.showPause = false;
					this.showHome = true;
				}
				FoodChain.sound.play("audio/disappointed");
				return;
			}

			// Frog is alive: count living flies
			var flies = this.flies.filter(function(fly) {
				return fly.alive;
			}).length;
			if (flies > 0) {
				return false;
			}

			// Show happy frog
			this.frog.unDraw(this.ctx);
			this.frog.x += 50;
			this.frog.y += 50;
			this.frog.useImage(8);
			this.frog.heading = 90;
			this.frog.draw(this.ctx);

			// No more, go to next level
			this.timerPaused = true;
			FoodChain.sound.play("audio/applause");
			this.computeLevelScore();
			this.showPlay = false;
			this.showPause = false;
			this.showHome = true;
			this.showForward = this.level != FoodChain.playLevels.length;
			return true;
		},

		// Sound ended: next life
		endSound: function() {
			if (this.nextaction == 1 && this.frog) {
				this.nextaction = 0;
				var frog = this.frog;
				frog.unDraw(this.ctx);
				frog.x = 70;
				frog.y = (FoodChain.playArea.height / 2) - 20;
				frog.heading = 0;
				frog.useImage(0);
				frog.draw(this.ctx);
				frog.alive = true;
				this.redrawRocks();
			}
		},

		// Score for this level: the time left
		computeLevelScore: function() {
			var seconds = this.seconds();
			if (seconds < this.config.time) {
				this.addScore(this.config.time - seconds);
			}
		},

		play: function() {
			this.timerPaused = false;
			this.showPlay = false;
			this.showPause = true;
			this.showHome = false;
		},

		pause: function() {
			this.timerPaused = true;
			this.showPause = false;
			this.showPlay = true;
			this.showHome = true;
		},

		next: function() {
			this.level++;
			this.levelChanged();
			this.initGame();
		},

		home: function() {
			this.$emit("home");
		}
	}
};
