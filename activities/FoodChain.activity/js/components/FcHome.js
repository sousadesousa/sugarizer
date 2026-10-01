// Home screen: cards falling, games and credits
const FcHome = {
	template: `
		<div class="board" id="app">
			<div class="glass"></div>
			<div class="cardbox">
				<fc-card v-for="card in shown" :key="card.key" :cardname="card.name" :x="card.x" :y="card.y"></fc-card>
			</div>
			<img src="images/FoodChain.png" class="logo">
			<fc-shadow-button v-for="game in games" :key="game.name" :id="'app_' + game.name" :img="game.img" :class="'game-' + game.name" @click="$emit('play', game.name)" @mouseenter="description = game.name" @mouseleave="description = null"></fc-shadow-button>
			<fc-shadow-button id="app_shadowButton" img="information" class="information" @click="$emit('credits')"></fc-shadow-button>
			<div class="game-popup" v-show="description !== null">
				<div class="game-title" :class="'game-color-' + description">{{ title }}</div>
				<div class="game-description" :class="'game-color-' + description">{{ details }}</div>
			</div>
		</div>
	`,
	emits: ["play", "credits"],
	data: function() {
		return {
			games: [
				{ name: "LearnGame", img: "one", key: "learn" },
				{ name: "BuildGame", img: "two", key: "build" },
				{ name: "PlayGame", img: "three", key: "play" }
			],
			// Game described by the popup
			description: null,
			shown: []
		};
	},
	computed: {
		game: function() {
			var name = this.description;
			return this.games.find(function(game) {
				return game.name == name;
			});
		},
		title: function() {
			return this.game ? FoodChain.text(this.game.key) + ":" : "";
		},
		details: function() {
			return this.game ? FoodChain.text(this.game.key + "desc") : "";
		}
	},
	created: function() {
		this.counter = 0;
		this.initCardStack();
	},
	mounted: function() {
		FoodChain.sound.play("audio/popcorn", true);
		this.timerJob = window.setInterval(this.displayCard, 1200);
	},
	beforeUnmount: function() {
		window.clearInterval(this.timerJob);
	},
	methods: {
		// Pick randomly 12 different cards for the animation
		initCardStack: function() {
			this.cardcount = 0;
			this.cards = FoodChain.mix(FoodChain.cards).slice(0, 12);
		},

		// Display a new card at a random position, or restart when all are displayed
		displayCard: function() {
			if (this.cardcount == this.cards.length) {
				this.shown = [];
				this.initCardStack();
				return;
			}
			var x = Math.floor(Math.random() * window.innerWidth * 0.7);
			var y = Math.floor(Math.random() * window.innerHeight * 0.7);
			this.shown.push({ key: ++this.counter, name: this.cards[this.cardcount], x: x, y: y });
			this.cardcount++;
		}
	}
};

// Credits screen
const FcCredits = {
	template: `
		<div class="board credits-popup">
			<div class="credit-content">
				<div class="two-column-credits">
					<div class="credit-title">{{ text('concept') }}</div>
					<div class="credit-name">Lionel Laské</div>
					<div class="credit-title">{{ text('arts') }}</div>
					<div class="credit-name">Art4Apps (learn &amp; build game)</div>
					<div class="credit-name">Vicki Wenderlich (play game)</div>
					<div class="credit-name">Mathafix (icon)</div>
					<div class="credit-name">Ray Larabie (home font)</div>
					<div class="credit-title">{{ text('music') }}</div>
					<div class="credit-name">part of Popcorn by Gershon Kingsley</div>
					<div class="credit-title">{{ text('sound') }}</div>
					<div class="credit-name">Charel Sytze (applause)</div>
					<div class="credit-name">Unchaz (disappointment)</div>
					<div class="credit-name">Esformouse (frog)</div>
					<div class="credit-name">Galeky (flyes)</div>
					<div class="credit-name">Novino (snake)</div>
				</div>
				<canvas ref="canvas" class="emul-canvas" width="300" height="600"></canvas>
			</div>
			<fc-shadow-button id="credits_home" img="home" class="home" @click="$emit('home')"></fc-shadow-button>
		</div>
	`,
	emits: ["home"],
	mounted: function() {
		var canvas = this.$refs.canvas;
		FoodChain.loadImages(["frog4", "fly1", "snake4"], function() {
			var zoom = FoodChain.getZoomLevel();
			canvas.style.zoom = zoom;
			var ctx = canvas.getContext("2d");
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			new FoodChain.Sprite({ x: 150, y: 50, heading: 0, images: ["fly1"], width: 58, height: 86, index: 0 }).draw(ctx);
			new FoodChain.Sprite({ x: 150, y: 200, heading: 90, images: ["frog4"], width: 116, height: 172, index: 0 }).draw(ctx);
			new FoodChain.Sprite({ x: 150, y: 450, heading: 90, images: ["snake4"], width: 100, height: 250, index: 0 }).draw(ctx);
		});
	},
	methods: {
		text: function(key) {
			return FoodChain.text(key);
		}
	}
};
