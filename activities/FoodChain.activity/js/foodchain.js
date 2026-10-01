// FoodChain shared code: data, state, localization, context, sprites and sounds
var FoodChain = {};

// Cards lists
FoodChain.cards = [
	"alligator", "animal", "bat", "bee", "bird", "camel", "cat", "chicken", "chimp",
	"clam", "corn", "cow", "crab", "crocodile", "crow", "dog", "duck", "fish", "flies",
	"fox", "frog", "giraffe", "goat", "grass", "hay", "hen", "lamb", "mice", "mole",
	"mosquito", "mule", "owl", "ox", "pig", "rat", "shark", "shrimp", "skunk", "snail",
	"snake", "spider", "spike", "squid", "squirrel", "starfish", "swan", "tick", "wheat"
];

// Feed strategy list and members
FoodChain.feedStrategy = [
	{ name: "herbivore", members: ["swan", "bee", "cow", "giraffe", "squirrel", "goat", "ox", "lamb", "mule", "camel", "chimp"] },
	{ name: "carnivore", members: ["mosquito", "mole", "spike", "tick", "squid", "crab", "owl", "snake", "dog", "alligator", "bat", "crocodile", "frog", "shark", "spider", "starfish", "crocodile"] },
	{ name: "omnivore", members: ["duck", "flies", "pig", "mice", "rat", "skunk", "chicken", "hen", "fox"] }
];

// Chains computation
FoodChain.validChains = [
	["snake", "mice", "corn"],
	["cat", "mice", "corn"],
	["fox", "bird", "spider", "mosquito"],
	["fox", "bird", "spider", "flies"],
	["fox", "duck", "frog", "flies"],
	["snake", "frog", "mosquito"],
	["snake", "frog", "flies"],
	["fox", "duck", "frog", "snail", "grass"],
	["spike", "spider", "mosquito"],
	["spike", "spider", "flies"],
	["shark", "fish", "shrimp"],
	["owl", "bat", "mosquito"],
	["owl", "bat", "flies"],
	["cat", "bat", "mosquito"],
	["cat", "bat", "flies"],
	["fox", "hen", "corn"],
	["fox", "chicken", "corn"],
	["cow", "grass"],
	["starfish", "clam"],
	["frog", "snail", "grass"],
	["skunk", "rat", "snail", "grass"],
	["skunk", "mice", "snail", "grass"],
	["spike", "snail", "grass"],
	["crow", "snail", "grass"],
	["duck", "snail", "grass"],
	["starfish", "crab"]
];

// Levels of the games
FoodChain.learnLevels = [
	{ size: 2, count: 5, time: 10 },
	{ size: 2, count: 10, time: 15 },
	{ size: 2, count: 15, time: 20 },
	{ size: 3, count: 5, time: 10 },
	{ size: 3, count: 10, time: 15 },
	{ size: 3, count: 15, time: 20 }
];
FoodChain.buildLevels = [
	{ size: 2, time: 2 },
	{ size: 3, time: 5 },
	{ size: 3, time: 3 },
	{ size: 3, time: 2 },
	{ size: 4, time: 5 },
	{ size: 4, time: 3 },
	{ size: 5, time: 3 }
];
FoodChain.playLevels = [
	{ flies: 2, rocks: 2, snakes: 0, time: 15 },
	{ flies: 2, rocks: 3, snakes: 0, time: 10 },
	{ flies: 3, rocks: 3, snakes: 0, time: 15 },
	{ flies: 3, rocks: 4, snakes: 1, time: 30 },
	{ flies: 4, rocks: 4, snakes: 1, time: 40 },
	{ flies: 3, rocks: 3, snakes: 2, time: 50 }
];

// Keys to use in the play game
FoodChain.playKeys = [
	{ key: "ArrowDown", heading: 270, dx: 0, dy: 1 },
	{ key: "ArrowUp", heading: 90, dx: 0, dy: -1 },
	{ key: "ArrowLeft", heading: 180, dx: -1, dy: 0 },
	{ key: "ArrowRight", heading: 0, dx: 1, dy: 0 }
];

// Play area size
FoodChain.playArea = { width: 984, height: 560 };

// Sprite size constant
FoodChain.sprites = {
	frog: { dx: 100, dy: 152 },
	rock: { dx: 112, dy: 101 },
	fly: { dx: 50, dy: 80 },
	snake: { dx: 100, dy: 250 }
};

// Reactive state shared by the screens
FoodChain.state = Vue.reactive({
	// Language of the activity: "en", "fr" or "pt_BR"
	lang: "en",
	// Changes when a dictionary is loaded
	dictionaries: 0,
	// Images and sounds installed with the activity (or loaded from a server)
	localDatabase: true,
	// Game playing: "", "LearnGame", "BuildGame" or "PlayGame"
	game: "",
	level: 0,
	score: 0,
	fullscreen: false
});

// Create a random foodchain for the specified size (game build)
FoodChain.randomChain = function(size) {
	if (size == undefined) {
		size = 3;
	}
	var chains = [];
	FoodChain.validChains.forEach(function(c) {
		if (c.length < size) {
			return;
		}
		if (c.length == size) {
			chains.push(c);
			return;
		}
		// Too long, compute randomly a subchain
		var index = Math.floor(Math.random() * (c.length - size));
		chains.push(c.slice(index, index + size));
	});
	return chains[Math.floor(Math.random() * chains.length)];
};

// Mix a chain
FoodChain.mix = function(chain) {
	var mixed = chain.slice();
	for (var i = mixed.length - 1 ; i > 0 ; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = mixed[i];
		mixed[i] = mixed[j];
		mixed[j] = tmp;
	}
	return mixed;
};

// Create a random feed card list for the specified size and count (game learn)
FoodChain.randomFeedList = function(size, count) {
	if (size == undefined) {
		size = 2;
	}
	var list = [];
	for (var i = 0 ; i < count ; i++) {
		// Choose randomly a feed strategy, then a card not already picked
		var strategy = Math.floor(Math.random() * size);
		var cardname;
		do {
			var members = FoodChain.feedStrategy[strategy].members;
			cardname = members[Math.floor(Math.random() * members.length)];
		} while (list.some(function(card) {
			return card.cardname == cardname;
		}));
		list.push({ cardname: cardname, strategy: strategy });
	}
	return list;
};

// Create an object respecting a condition on a set of objects
FoodChain.createWithCondition = function(create, condition, set) {
	var conditionValue;
	var newObject;
	var time = 0;
	do {
		conditionValue = true;
		newObject = create();
		for (var i = 0 ; conditionValue && i < set.length ; i++) {
			conditionValue = condition(newObject, set[i]);
		}
		time++;
	} while (!conditionValue && time < 12); // time to avoid infinite or too long loop in very complex situation
	if (!conditionValue) {
		console.log("WARNING: out of pre-requisite creating object");
	}
	return newObject;
};

// Test if two sound strings match ignoring audio directory
FoodChain.soundMatch = function(s1, s2) {
	var l1 = s1.lastIndexOf("/");
	var l2 = s2.lastIndexOf("/");
	return s1.substring(Math.max(l1, 0)) == s2.substring(Math.max(l2, 0));
};

// Get zoom level
FoodChain.getZoomLevel = function() {
	var wsize = window.innerWidth;
	if (wsize <= 480) return 0.4;
	if (wsize <= 640) return 0.5;
	if (wsize <= 854) return 0.62;
	if (wsize <= 960) return 0.72;
	if (wsize <= 1024) return 0.88;
	return 1;
};

// Time as displayed: minutes:seconds,tenth
FoodChain.formatTime = function(timecount) {
	return timecount.mins + ":" + String("00" + timecount.secs).slice(-2) + "," + timecount.tenth;
};

// Score as displayed
FoodChain.formatScore = function(score) {
	return String("0000" + score).slice(-4);
};

// Prefix of the images and sounds: empty if they are installed with the activity
FoodChain.getDatabase = function() {
	return FoodChain.state.localDatabase ? "" : "http://server.sugarizer.org/activities/FoodChain.activity/";
};

// Check if the images and sounds are installed with the activity
FoodChain.checkDatabase = function(callback) {
	var image = new Image();
	image.onload = function() {
		FoodChain.state.localDatabase = true;
		callback(true);
	};
	image.onerror = function() {
		FoodChain.state.localDatabase = false;
		callback(false);
	};
	image.src = "images/cards/_ping.png?" + (new Date()).getTime();
};

// Localization: the language of the activity is chosen with the toolbar
FoodChain.languages = ["en", "fr", "pt_BR"];
FoodChain.dictionaries = {};

// Language of the activity for a language of the user
FoodChain.languageFor = function(language) {
	var code = (language || "").split("-")[0];
	if (code == "fr" || code == "en") {
		return code;
	}
	return code == "pt" ? "pt_BR" : "en";
};

// Load the dictionary of a language, callback() when done
FoodChain.loadLanguage = function(lang, callback) {
	if (FoodChain.dictionaries[lang]) {
		callback();
		return;
	}
	requirejs(["lib/axios.min.js"], function(axios) {
		axios.get("locales/" + lang + ".json").then(function(response) {
			FoodChain.dictionaries[lang] = response.data;
			FoodChain.state.dictionaries++;
			callback();
		}).catch(function(error) {
			console.log("Failed to load " + lang + " language: " + error);
			if (lang != "en") {
				FoodChain.loadLanguage("en", callback);
			}
		});
	});
};

// Localized string
FoodChain.text = function(key) {
	var state = FoodChain.state;
	var dictionary = FoodChain.dictionaries[state.lang] || FoodChain.dictionaries.en || {};
	var value = dictionary[key];
	if (state.dictionaries >= 0 && value !== undefined && value !== "") {
		return value.replace(/%27/g, "'").replace(/%22/g, "\"");
	}
	if (key == "sounddir") { // HACK: At first launch not always initialized
		return state.lang;
	}
	return key;
};

// Change the language of the activity
FoodChain.setLanguage = function(lang) {
	FoodChain.loadLanguage(lang, function() {
		FoodChain.state.lang = lang;
	});
};

// Light sprite class
FoodChain.images = {};

// Load images by name from images/<name>.png, callback() when all are loaded
FoodChain.loadImages = function(names, callback) {
	var remaining = names.filter(function(name) {
		return !FoodChain.images[name];
	});
	if (remaining.length == 0) {
		callback();
		return;
	}
	var count = remaining.length;
	remaining.forEach(function(name) {
		var image = new Image();
		image.onload = function() {
			FoodChain.images[name] = image;
			if (--count == 0) {
				callback();
			}
		};
		image.src = "images/" + name + ".png";
	});
};

FoodChain.Sprite = function(options) {
	this.x = 0;
	this.y = 0;
	this.width = 0;
	this.height = 0;
	this.heading = 0;
	this.images = [];
	this.index = -1;
	this.sound = "";
	for (var key in options) {
		this[key] = options[key];
	}
	this.halfWidth = this.width / 2;
	this.halfHeight = this.height / 2;
	this.animating = false;
};

FoodChain.Sprite.prototype = {
	// Draw the sprite in the canvas context
	draw: function(ctx) {
		ctx.save();
		ctx.translate(this.x, this.y);
		ctx.rotate((90 - this.heading) * (Math.PI / 180));
		ctx.translate(-this.halfWidth, -this.halfHeight);
		ctx.drawImage(FoodChain.images[this.images[this.index]], 0, 0);
		ctx.restore();
	},

	// Compute min rectangle around sprite
	computeRect: function() {
		var rotate = (90 - this.heading) * (Math.PI / 180);
		var wc = this.halfWidth * Math.cos(rotate);
		var hc = this.halfHeight * Math.cos(rotate);
		var ws = this.halfWidth * Math.sin(rotate);
		var hs = this.halfHeight * Math.sin(rotate);
		var sx0 = this.x - wc + hs;
		var sy0 = this.y - hc + ws;
		var sx1 = this.x + wc + hs;
		var sy1 = this.y - hc - ws;
		var sx2 = this.x + wc - hs;
		var sy2 = this.y + hc - ws;
		var sx3 = this.x - wc - hs;
		var sy3 = this.y + hc + ws;
		var x0 = Math.min(sx0, sx1, sx2, sx3);
		var y0 = Math.min(sy0, sy1, sy2, sy3);
		var x1 = Math.max(sx1, sx2, sx3);
		var y1 = Math.max(sy1, sy2, sy3);
		return { x: x0, y: y0, dx: x1 - x0, dy: y1 - y0 };
	},

	// Undraw the sprite: i.e. clear canvas at the sprite pos
	unDraw: function(ctx) {
		var rect = this.computeRect();
		ctx.clearRect(rect.x, rect.y, rect.dx, rect.dy);
	},

	firstImage: function() {
		this.index = 0;
	},

	useImage: function(index) {
		this.index = index;
	},

	// Play sound of the sprite
	playSound: function() {
		if (this.sound != "") {
			FoodChain.sound.play(this.sound);
		}
	},

	// Test if the sprite intersect another sprite
	intersect: function(sprite) {
		var r1 = this.computeRect();
		var r2 = sprite.computeRect();
		return !(r2.x > (r1.x + r1.dx) || (r2.x + r2.dx) < r1.x ||
			r2.y > (r1.y + r1.dy) || (r2.y + r2.dy) < r1.y);
	},

	// Animate the sprite using a list of images and a movement
	animate: function(ctx, images, dx, dy, action) {
		if (this.animating) {
			return;
		}
		this.animating = true;
		this.animation = { ctx: ctx, index: 0, images: images, dx: dx, dy: dy, action: action };
		this.animation.job = window.setInterval(this.animateTimer.bind(this), 50);
	},

	// Stop the animation
	stop: function() {
		if (this.animation) {
			window.clearInterval(this.animation.job);
		}
		this.animating = false;
	},

	// Timer use of animation
	animateTimer: function() {
		var animation = this.animation;
		// End of animation ?
		if (animation.index == animation.images.length) {
			this.stop();
			return;
		}

		// Draw current frame
		this.unDraw(animation.ctx);
		if (animation.dx != undefined) {
			this.x += animation.dx;
		}
		if (animation.dy != undefined) {
			this.y += animation.dy;
		}
		this.useImage(animation.images[animation.index]);
		this.draw(animation.ctx);

		// HACK: On Android, force redraw of canvas
		var canvas = document.getElementById("acanvas");
		if (canvas && /android/i.test(navigator.userAgent) && document.location.protocol.substr(0, 4) != "http") {
			canvas.style.display = "none";
			canvas.offsetHeight;
			canvas.style.display = "block";
		}

		// Action to do at each move
		if (animation.action != undefined && !animation.action(this)) {
			this.stop();
			return;
		}

		// Next frame
		animation.index = animation.index + 1;
	}
};

// Sound engine: plays one sound at a time and tells when it ends
// (HTML5 audio, or the Media plugin in Android and iOS apps)
FoodChain.Audio = function() {
	var userAgent = navigator.userAgent;
	this.isAndroid = /android/i.test(userAgent);
	this.isIOS = /iPad|iPhone|iPod/.test(userAgent);
	this.isCordova = (this.isAndroid || this.isIOS) && document.location.protocol.substr(0, 4) != "http";
	this.format = ".mp3";
	this.current = null;
	this.started = false;
	this.listeners = [];
	this.media = null;

	var that = this;
	this.node = new Audio();
	this.node.preload = "auto";
	this.node.addEventListener("ended", function() {
		that.emit(that.current);
	});
	this.handleVolumeButtons();
};

FoodChain.Audio.prototype = {
	// Listen to the end of sounds
	on: function(listener) {
		this.listeners.push(listener);
	},

	off: function(listener) {
		var index = this.listeners.indexOf(listener);
		if (index != -1) {
			this.listeners.splice(index, 1);
		}
	},

	emit: function(sound) {
		this.listeners.slice().forEach(function(listener) {
			listener(sound);
		});
	},

	// Handle volume buttons on Android
	handleVolumeButtons: function() {
		if (!this.isCordova || this.isIOS) {
			return;
		}
		// HACK: Need only on Android because Cordova intercept volume buttons
		var empty = function() {};
		var change = function(delta) {
			return function() {
				cordova.plugins.VolumeControl.getVolume(function(value) {
					var volume = parseInt(value);
					if ((delta > 0 && volume < 100) || (delta < 0 && volume > 0)) {
						cordova.plugins.VolumeControl.setVolume(volume + delta, empty, empty);
					}
				}, empty);
			};
		};
		document.addEventListener("volumeupbutton", change(10), false);
		document.addEventListener("volumedownbutton", change(-1), false);
	},

	// Play a sound, given without extension. A looping sound never ends.
	play: function(sound, loop) {
		this.current = sound;
		var src = sound + this.format;
		if (this.isCordova) {
			this.playWithMedia(src);
			return;
		}
		this.node.loop = !!loop;
		this.node.src = src;
		this.started = false;
		var that = this;
		var promise = this.node.play();
		if (promise) {
			promise.then(function() {
				that.started = true;
			}).catch(function() {
				// The sound can't be played (blocked by the browser or missing): end it so the game goes on
				if (!loop && that.current == sound) {
					setTimeout(function() {
						that.emit(sound);
					}, 300);
				}
			});
		} else {
			this.started = true;
		}
	},

	// HACK: HTML5 Audio don't work in PhoneGap on Android and iOS, use Media PhoneGap component instead
	playWithMedia: function(src) {
		var database = FoodChain.getDatabase();
		var path = (database.length == 0 || src.indexOf("cards") == -1) ? location.pathname.substring(0, 1 + location.pathname.lastIndexOf("/")) + src : src;
		var that = this;
		this.releaseMedia();
		var playMedia = function(url) {
			that.media = new Media(url, function() {}, function() {}, function(status) {
				if (status == 4 && this.src != "") {
					that.emit(that.current);
				}
			});
			that.media.play();
		};

		// HACK: On iOS, remote MP3 should be downloaded locally first
		if (this.isIOS && path.substr(0, 4) == "http") {
			var fileTransfer = new FileTransfer();
			var fileURL = "cdvfile://localhost/temporary/sugarizer/foodchain.mp3";
			fileTransfer.download(path, fileURL, function() {
				playMedia(fileURL);
			}, function(error) {
				console.log("download error code " + error.code);
			}, true);
		} else {
			playMedia(path);
		}
	},

	releaseMedia: function() {
		if (this.media) {
			this.media.src = "";
			this.media.pause();
			this.media.release();
			this.media = null;
		}
	},

	pause: function() {
		if (this.isCordova) {
			this.releaseMedia();
			return;
		}
		if (this.started) {
			this.node.pause();
		}
	}
};

// Context saved in the journal: score, game and level playing, language
FoodChain.saveContext = function() {
	if (!FoodChain.activity) {
		return;
	}
	var state = FoodChain.state;
	var datastoreObject = FoodChain.activity.getDatastoreObject();
	datastoreObject.setDataAsText(JSON.stringify({
		score: state.score,
		game: state.game ? "FoodChain." + state.game : "",
		level: state.level,
		language: state.lang
	}));
	datastoreObject.save(function() {});
};

// Load the context, callback(context) with null if there is none
FoodChain.loadContext = function(callback) {
	FoodChain.activity.getDatastoreObject().loadAsText(function(error, metadata, data) {
		var context = null;
		try {
			context = data ? JSON.parse(data) : null;
		} catch (e) {
			context = null;
		}
		callback(context);
	});
};
