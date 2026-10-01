// Tank Operation game: constants, missions, units and rules
var TankOp = {};

// Constants
var constant = {};
constant.boardWidth = 15;
constant.boardHeight = 9;
constant.tileSize = 64;
constant.areaWidth = constant.boardWidth * constant.tileSize;
constant.areaHeight = constant.boardHeight * constant.tileSize;
constant.pubHeight = 100;
constant.fireZoneWidth = 100;
constant.fireZoneHeight = 100;

// Tile type
constant.tileEmpty = 0;
constant.tileTrees = 1;
constant.tileMountain = 2;
constant.tileWater = 3;

// Unit power - number of step before dead
constant.powerHq = 2;
constant.powerSoldier = 1;
constant.powerTank = 2;
constant.powerCanon = 3;
constant.powerHelo = 2;

// User power
constant.userPower = 10;

// Timer count
constant.loopInterval = 500;
constant.explosionInterval = 50;

// End size image
constant.endGameWidth = 480;
constant.endGameHeight = 320;

// Units arrival
constant.startArrival = 5;
constant.waveInitSize = 2;

// Game map: - = Grass, H = Trees, ^ = Mountain, O = Lake
TankOp.gameMap = function(map) {
	if (map == "grass") {
		return	"---HOH-----H---" +
				"----H----------" +
				"---------------" +
				"---------------" +
				"---------------" +
				"-----------H---" +
				"-----H---------" +
				"---------------" +
				"---------H-H---";
	} else if (map == "trees") {
		return	"------H--HHHH^-" +
				"----H--H----HH-" +
				"------H---H----" +
				"---------------" +
				"---------------" +
				"---H-----------" +
				"-------HH------" +
				"-----H--H---H--" +
				"---HHH---HH--H-";
	} else if (map == "mountain") {
		return	"---HHH^^^HHH---" +
				"----HHH^^HH--H-" +
				"------H-HH-----" +
				"---H-----------" +
				"-------O-------" +
				"-----------H---" +
				"-----H-H-------" +
				"-----HHH^H-H---" +
				"----HHH^^^HHH--";
	}
	return new Array(constant.boardWidth * constant.boardHeight).join("-");
};

// Functions to generate the operation of an enemy: tag is displayed, result is the answer
TankOp.typeNumber = function() {
	var number = Math.floor(Math.random() * 11);
	return { tag: "" + number, result: number };
};

TankOp.generateFunctionAddFromTo = function(start, end) {
	var difference = end - start + 1;
	return function() {
		var number1 = start + Math.floor(Math.random() * difference);
		var number2 = start + Math.floor(Math.random() * difference);
		return { tag: "" + number1 + "+" + number2, result: number1 + number2 };
	};
};

TankOp.missingNumbers = function() {
	var number1 = Math.floor(Math.random() * 11);
	var number2 = Math.floor(Math.random() * 11);
	return { tag: "" + number1 + "+?=" + (number1 + number2), result: number2 };
};

TankOp.generateFunctionSubstractFromTo = function(start, end, negative) {
	var difference = end - start + 1;
	return function() {
		var number1 = start + Math.floor(Math.random() * difference);
		var number2 = start + Math.floor(Math.random() * difference);
		if (!negative && Math.abs(number2) > Math.abs(number1)) {
			var tmp = number1;
			number1 = number2;
			number2 = tmp;
		}
		return { tag: "" + number1 + "-" + number2, result: number1 - number2 };
	};
};

TankOp.additionSubtraction = function() {
	var number1 = Math.floor(Math.random() * 21);
	var number2 = Math.floor(Math.random() * 11);
	if (Math.floor(Math.random() * 2) == 0) {
		return { tag: "" + number1 + "+" + number2, result: number1 + number2 };
	}
	if (Math.abs(number2) > Math.abs(number1)) {
		var tmp = number1;
		number1 = number2;
		number2 = tmp;
	}
	return { tag: "" + number1 + "-" + number2, result: number1 - number2 };
};

// Missions
// id: id of the name in the localization, map: name of the map
// defense: composition of the defense: #HQ, #Soldier, #Tank, #Canon, #Helo
// attack: #attacking units
// stats: attack composition, a random number between 0-9 compared to the array numbers for: HQ, Soldier, Tank, Canon, Helo
// generator: function to generate the operation
TankOp.levels = [
	{ id: "Type", map: "mountain", defense: [4, 0, 4, 0, 0], attack: 22, stats: [10, 10, 0, 9, 10], generator: TankOp.typeNumber },
	{ id: "ADD3", map: "trees", defense: [4, 2, 2, 0, 0], attack: 20, stats: [10, 0, 8, 10, 10], generator: TankOp.generateFunctionAddFromTo(1, 3) },
	{ id: "ADD5", map: "grass", defense: [4, 3, 1, 0, 0], attack: 30, stats: [10, 0, 8, 10, 9], generator: TankOp.generateFunctionAddFromTo(0, 5) },
	{ id: "SUM10", map: "mountain", defense: [4, 0, 4, 0, 0], attack: 30, stats: [10, 10, 0, 8, 9], generator: TankOp.generateFunctionAddFromTo(0, 10) },
	{ id: "SUM15", map: "trees", defense: [4, 2, 2, 0, 0], attack: 30, stats: [10, 0, 7, 10, 10], generator: TankOp.generateFunctionAddFromTo(0, 15) },
	{ id: "SUM20", map: "grass", defense: [4, 3, 1, 0, 0], attack: 40, stats: [10, 0, 7, 10, 9], generator: TankOp.generateFunctionAddFromTo(0, 20) },
	{ id: "TDN", map: "mountain", defense: [4, 4, 4, 0, 0], attack: 40, stats: [10, 0, 1, 8, 9], generator: TankOp.generateFunctionAddFromTo(10, 20) },
	{ id: "Missing", map: "trees", defense: [4, 2, 2, 0, 0], attack: 40, stats: [10, 0, 7, 10, 10], generator: TankOp.missingNumbers },
	{ id: "S010", map: "grass", defense: [4, 0, 4, 0, 0], attack: 40, stats: [10, 10, 0, 9, 10], generator: TankOp.generateFunctionSubstractFromTo(0, 10, false) },
	{ id: "S020", map: "trees", defense: [4, 2, 2, 0, 0], attack: 20, stats: [10, 0, 8, 10, 10], generator: TankOp.generateFunctionSubstractFromTo(0, 20, false) },
	{ id: "STW", map: "mountain", defense: [4, 4, 4, 0, 0], attack: 30, stats: [10, 0, 1, 8, 9], generator: TankOp.generateFunctionSubstractFromTo(10, 30, false) },
	{ id: "AAS", map: "trees", defense: [4, 2, 2, 0, 0], attack: 40, stats: [10, 0, 7, 10, 10], generator: TankOp.additionSubtraction }
];

// Reactive state shared by the screens
TankOp.state = Vue.reactive({
	// Missions completed, one boolean by mission
	completed: TankOp.levels.map(function() {
		return false;
	}),
	// Mission selected on the home screen
	currentLevel: 0,
	fullscreen: false
});

// Mission completed states for the journal
TankOp.getState = function() {
	return TankOp.state.completed.slice();
};

TankOp.setState = function(states) {
	if (!Array.isArray(states) || states.length != TankOp.levels.length) {
		return false;
	}
	states.forEach(function(completed, i) {
		TankOp.state.completed[i] = !!completed;
	});
	return true;
};

// Images of the game, loaded once by name
TankOp.images = {};
TankOp.imageNames = function() {
	var names = ["endgame_victory", "endgame_defeat", "target", "move", "grass", "trees", "mountain", "water", "hq_blue", "hq_red"];
	for (var i = 1 ; i <= 7 ; i++) names.push("explosion_" + i);
	["helo", "soldier", "canon", "tank"].forEach(function(type) {
		["blue", "red"].forEach(function(color) {
			for (var i = 0 ; i < 4 ; i++) names.push(type + "_" + color + "_" + i);
		});
	});
	return names;
};

// Load the images, callback() when all are loaded
TankOp.loadImages = function(callback) {
	var remaining = TankOp.imageNames().filter(function(name) {
		return !TankOp.images[name];
	});
	if (remaining.length == 0) {
		callback();
		return;
	}
	var count = remaining.length;
	remaining.forEach(function(name) {
		var image = new Image();
		image.onload = function() {
			TankOp.images[name] = image;
			if (--count == 0) {
				callback();
			}
		};
		image.onerror = image.onload;
		image.src = "images/" + name + ".png";
	});
};

// Unit of the game
// Heading: 0 <, 1 ^, 2 >, 3 v
TankOp.Sprite = function(options) {
	this.x = 0;
	this.y = 0;
	this.heading = 0;
	this.power = 0;
	this.images = [];
	this.engine = null;
	for (var key in options) {
		this[key] = options[key];
	}
};

TankOp.Sprite.prototype = {
	// Draw the sprite in the canvas context
	draw: function(ctx) {
		ctx.save();
		ctx.translate(this.x * constant.tileSize, this.y * constant.tileSize);
		ctx.drawImage(TankOp.images[this.getCurrentImage()], 0, 0);
		if (this.value !== undefined) {
			ctx.font = "29px Arial";
			ctx.strokeStyle = "#000000";
			var x = (constant.tileSize - ctx.measureText(this.value.tag).width) / 2;
			ctx.strokeText(this.value.tag, x, 50);
			ctx.fillStyle = "#FFFF00";
			ctx.fillText(this.value.tag, x + 2, 51);
		}
		ctx.restore();
	},

	// Get current image of the sprite
	getCurrentImage: function() {
		return this.images[this.heading < this.images.length ? this.heading : 0];
	}
};

// Rules of a mission: the map, the units and the waves of enemies
// callbacks: explode(unit) when a unit is hit, sound(name) to play a sound
TankOp.Game = function(level, callbacks) {
	this.level = level;
	this.callbacks = callbacks || {};
	this.units = [];
	this.endOfGame = false;
	this.win = false;
	this.init();
};

TankOp.Game.moves = [{ dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: +1, dy: 0 }, { dx: 0, dy: +1 }];
TankOp.Game.unitTypes = ["hq", "soldier", "tank", "canon", "helo"];
TankOp.Game.unitPowers = [constant.powerHq, constant.powerSoldier, constant.powerTank, constant.powerCanon, constant.powerHelo];
TankOp.Game.explosionsImages = ["explosion_1", "explosion_2", "explosion_3", "explosion_4", "explosion_5", "explosion_6", "explosion_7"];

TankOp.Game.prototype = {
	// Prepare the board using the ground model
	createMap: function(grounds) {
		var game = [];
		var index = 0;
		for (var i = 0 ; i < constant.boardHeight ; i++) {
			var line = [];
			for (var j = 0 ; j < constant.boardWidth ; j++) {
				var ground = constant.tileEmpty;
				var current = grounds[index++];
				if (current == "O") ground = constant.tileWater;
				else if (current == "H") ground = constant.tileTrees;
				else if (current == "^") ground = constant.tileMountain;
				line.push(ground);
			}
			game.push(line);
		}
		return game;
	},

	init: function() {
		var level = this.currentlevel = TankOp.levels[this.level];
		var settings_hq = level.defense[0];
		var settings_soldier = level.defense[1];
		var settings_tank = level.defense[2];
		var settings_canon = level.defense[3];
		var settings_helo = level.defense[4];
		var that = this;

		// Init board
		this.game = this.createMap(TankOp.gameMap(level.map));
		this.targetpos = { x: 7, y: 4 };
		var goodEngine = function(unit) {
			that.goodEngine(unit);
		};
		this.units = [];

		// Set HQ
		var step = constant.boardHeight / (settings_hq + 1);
		var hqs = [];
		for (var i = 0 ; i < settings_hq ; i++) {
			var hq = this.createUnit({ type: "hq", color: "blue", x: 0, y: Math.floor((i + 1) * step), engine: null });
			this.units.push(hq);
			hqs.push(hq);
		}

		// Create defending units
		var defense = [];
		for (var i = 0 ; i < settings_helo ; i++) defense.push({ type: "helo", color: "blue", engine: goodEngine });
		for (var i = 0 ; i < settings_canon ; i++) defense.push({ type: "canon", color: "blue", engine: goodEngine });
		for (var i = 0 ; i < settings_tank ; i++) defense.push({ type: "tank", color: "blue", engine: goodEngine });
		for (var i = 0 ; i < settings_soldier ; i++) defense.push({ type: "soldier", color: "blue", engine: goodEngine });

		// Set defense around hq
		if (defense.length > 0) {
			var hqindex = 0;
			var defenselength = Math.min(defense.length, 1 + hqs.length * 2);
			for (var i = 0 ; i < defenselength ; i++) {
				var position = {};
				do {
					var arounds = [{ dx: 1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 0, dy: 1 }];
					for (var j = 0 ; j < arounds.length ; j++) {
						position = { x: hqs[hqindex].x + arounds[j].dx, y: hqs[hqindex].y + arounds[j].dy };
						if (this.lookForUnit(position) == null) {
							break;
						}
						position = { x: -1, y: -1 };
					}
					hqindex = (hqindex + 1) % hqs.length;
				} while (position.x == -1);
				defense[i].x = position.x;
				defense[i].y = position.y;
				this.units.push(this.createUnit(defense[i]));
			}
		}

		// Prepare bad units arrival
		this.score = 0;
		this.wave = 1;
		this.enemyCount = level.attack;
		this.enemyWaveSize = constant.waveInitSize;
		this.enemyNextWaveCount = constant.waveInitSize;
		this.enemyWaveCount = 0;
		this.enemyArrivalTurn = constant.startArrival;
	},

	// Create a unit
	createUnit: function(unit) {
		var heading = unit.color == "blue" ? 2 : 0;
		var power = 0;
		for (var i = 0 ; i < TankOp.Game.unitTypes.length ; i++) {
			if (TankOp.Game.unitTypes[i] == unit.type) {
				power = TankOp.Game.unitPowers[i];
			}
		}
		var imageprefix = unit.type + "_" + unit.color;
		while (this.lookForUnit(unit) != null) {
			unit.x = unit.x + 1;
		}
		return new TankOp.Sprite({
			x: unit.x, y: unit.y,
			heading: heading, power: power,
			engine: unit.engine,
			images: (unit.type == "hq") ? [imageprefix] : [imageprefix + "_0", imageprefix + "_1", imageprefix + "_2", imageprefix + "_3"]
		});
	},

	// Test if a position is valid for a unit
	isValidPosition: function(position, sprite) {
		// Out of board
		if (position.x < 0 || position.x == constant.boardWidth || position.y < 0 || position.y == constant.boardHeight) {
			return false;
		}

		// Authorized ground depend of unit type
		var maptype = this.game[position.y][position.x];
		var unittype = this.getUnitType(sprite);
		if (unittype == 4) return true; // Helo can go anywhere
		if (maptype == constant.tileEmpty) return true; // Grass is for everyone
		if (unittype == 0) return maptype == constant.tileEmpty; // HQ only on grass
		if (maptype == constant.tileTrees) return unittype == 1; // Trees is only for soldier
		else if (maptype == constant.tileWater) return unittype == 1; // Water is only for soldier

		// Already a unit inside
		var unitinside = this.lookForUnit(position);
		if (unitinside != null) {
			return unitinside == sprite;
		}
		return false;
	},

	// Compute next position if sprite go ahead in the current heading
	nextPositionOnHeading: function(sprite) {
		var move = TankOp.Game.moves[sprite.heading];
		return { x: sprite.x + move.dx, y: sprite.y + move.dy };
	},

	// Look for unit at a position
	lookForUnit: function(position) {
		for (var i = 0 ; i < this.units.length ; i++) {
			if (this.units[i].x == position.x && this.units[i].y == position.y) {
				return this.units[i];
			}
		}
		return null;
	},

	// Look for units with a value (the LCD display is the result of their operation)
	lookForValue: function(value) {
		return this.units.filter(function(unit) {
			return unit.value !== undefined && unit.value.result == value;
		});
	},

	// Look for opponent around the sprite
	lookForOpponent: function(sprite) {
		var oppositeColor = sprite.getCurrentImage().indexOf("red") != -1 ? "blue" : "red";
		for (var i = 0 ; i < TankOp.Game.moves.length ; i++) {
			var position = { x: sprite.x + TankOp.Game.moves[i].dx, y: sprite.y + TankOp.Game.moves[i].dy };
			var neighbour = this.lookForUnit(position);
			if (neighbour != null && neighbour.getCurrentImage().indexOf(oppositeColor) != -1) {
				return { heading: i, unit: neighbour };
			}
		}
		return null;
	},

	// Get unit type
	getUnitType: function(unit) {
		var image = unit.getCurrentImage();
		for (var i = 0 ; i < TankOp.Game.unitTypes.length ; i++) {
			if (image.indexOf(TankOp.Game.unitTypes[i]) != -1) {
				return i;
			}
		}
		return -1;
	},

	// Test if a unit could beat another
	couldBeat: function(unit1, unit2) {
		var type1 = this.getUnitType(unit1);
		var type2 = this.getUnitType(unit2);
		if (type1 == 1 && type2 == TankOp.Game.unitTypes.length - 1) { // Soldier could beat Helo
			return true;
		}
		return type1 >= type2;
	},

	// Handle fight between two opponents
	processFight: function(unit1, unit2, power) {
		if (unit1 != null && !this.couldBeat(unit1, unit2)) {
			return;
		}
		unit2.power = unit2.power - (power !== undefined ? power : 1);
		if (this.callbacks.explode) {
			this.callbacks.explode(unit2);
		}
	},

	// Get a random number
	random: function(max) {
		return Math.floor(Math.random() * max);
	},

	// Get randomly a unit name
	randomUnit: function(stats) {
		var unittype = this.random(10);
		for (var i = TankOp.Game.unitTypes.length - 1 ; i > 0 ; i--) {
			if (unittype >= stats[i]) {
				return TankOp.Game.unitTypes[i];
			}
		}
	},

	// Compute nearest unit from me
	nearestUnit: function(me, units) {
		var current = -1;
		var near = constant.boardWidth * constant.boardHeight;
		for (var i = 0 ; i < units.length ; i++) {
			var distance = Math.abs(units[i].x - me.x) + Math.abs(units[i].y - me.y);
			if (distance < near) {
				current = i;
				near = distance;
			}
		}
		return current != -1 ? units[current] : null;
	},

	// The user enters the result on the LCD display and fires
	fire: function(value) {
		var units = this.lookForValue(value);
		if (units.length != 0) {
			for (var i = 0 ; i < units.length ; i++) {
				this.processFight(null, units[i], constant.userPower);
				this.targetpos.x = units[i].x;
				this.targetpos.y = units[i].y;
			}
		} else if (this.callbacks.sound) {
			this.callbacks.sound("audio/missed");
		}
	},

	// The user shoots at the target
	fireOnTarget: function() {
		var targetunit = this.lookForUnit(this.targetpos);
		if (targetunit != null) {
			this.processFight(null, targetunit);
		}
	},

	// Move the target in a direction, if it stays in the board
	moveTarget: function(dx, dy) {
		var newX = this.targetpos.x + dx;
		var newY = this.targetpos.y + dy;
		if (newX < 0 || newX == constant.boardWidth || newY < 0 || newY == constant.boardHeight) {
			return;
		}
		this.targetpos.x = newX;
		this.targetpos.y = newY;
	},

	// Tick for game loop: remove dead units, test victory/defeat, then waves and units engines
	tick: function() {
		// Sanitize: clean dead units and compute victory/defeat conditions
		var alives = [];
		var hqs = [];
		var livingHq = 0;
		var livingEnemy = 0;
		for (var i = 0 ; i < this.units.length ; i++) {
			var unit = this.units[i];
			var isRed = unit.getCurrentImage().indexOf("red") != -1;
			if (unit.power > 0) {
				alives.push(unit);
			} else {
				if (isRed) {
					this.enemyNextWaveCount--;
					this.score += TankOp.Game.unitPowers[this.getUnitType(unit)];
				}
				continue;
			}
			if (this.getUnitType(unit) == 0) {
				hqs[livingHq++] = unit;
			}
			if (isRed) {
				livingEnemy++;
			}
		}
		this.units = alives;
		this.endOfGame = (livingHq == 0 || (livingEnemy == 0 && this.enemyCount == 0));
		this.win = (livingHq > 0);
		if (this.endOfGame) {
			return;
		}

		// Next wave
		if (this.enemyNextWaveCount == 0) {
			this.wave++;
			this.enemyWaveSize += 2;
			this.enemyWaveCount = 0;
			this.enemyNextWaveCount = this.enemyWaveSize;
			this.enemyArrivalTurn = constant.startArrival;
		}

		// Enemy arrival
		else if (this.enemyWaveCount != this.enemyWaveSize) {
			if (this.enemyArrivalTurn == 0 && this.enemyCount > 0) {
				var that = this;
				var enemy = this.createUnit({
					type: this.randomUnit(this.currentlevel.stats),
					color: "red",
					heading: 0,
					engine: function(unit, hqs) {
						that.badEngine(unit, hqs);
					},
					x: constant.boardWidth - 1,
					y: this.random(constant.boardHeight)
				});
				enemy.value = this.currentlevel.generator();
				this.units.push(enemy);
				this.enemyCount = this.enemyCount - 1;
				this.enemyWaveCount++;
				this.enemyArrivalTurn = constant.startArrival;
			} else {
				this.enemyArrivalTurn = this.enemyArrivalTurn - 1;
			}
		}

		// Launch engine for each unit
		for (var i = 0 ; i < this.units.length ; i++) {
			var engine = this.units[i].engine;
			if (engine != null) {
				engine(this.units[i], hqs);
			}
		}
	},

	// Engine for good units: fight the opponent around
	goodEngine: function(that) {
		var opponent = this.lookForOpponent(that);
		if (opponent != null) {
			// Change heading toward opponent
			that.heading = opponent.heading;
			this.processFight(that, opponent.unit);
		}
	},

	// Engine for bad units: fight the opponent around or go to the nearest HQ
	badEngine: function(that, hqs) {
		var opponent = this.lookForOpponent(that);
		if (opponent != null) {
			that.heading = opponent.heading;
			this.processFight(that, opponent.unit);
			return;
		}

		// Change heading to go toward the nearest HQ
		var nearestHQ = this.nearestUnit(that, hqs);
		if (nearestHQ != null) {
			var dx = that.x - nearestHQ.x;
			var dy = that.y - nearestHQ.y;
			if (Math.abs(dx) > Math.abs(dy)) {
				that.heading = dx > 0 ? 0 : 2;
			} else {
				that.heading = dy > 0 ? 1 : 3;
			}
		}

		// Is it a valid position ? If not, try a random heading
		var next = this.nextPositionOnHeading(that);
		while (!this.isValidPosition(next, that)) {
			that.heading = this.random(4);
			next = this.nextPositionOnHeading(that);
		}
		that.x = next.x;
		that.y = next.y;
	},

	// Draw the board, the units and the target, or the end of the game
	draw: function(ctx) {
		ctx.clearRect(0, 0, constant.areaWidth, constant.areaHeight);

		// Draw board
		for (var i = 0 ; i < constant.boardHeight ; i++) {
			for (var j = 0 ; j < constant.boardWidth ; j++) {
				ctx.save();
				ctx.translate(j * constant.tileSize, i * constant.tileSize);
				ctx.drawImage(TankOp.images.grass, 0, 0);
				var tileType = this.game[i][j];
				if (tileType == constant.tileTrees) ctx.drawImage(TankOp.images.trees, 0, 0);
				else if (tileType == constant.tileMountain) ctx.drawImage(TankOp.images.mountain, 0, 0);
				else if (tileType == constant.tileWater) ctx.drawImage(TankOp.images.water, 0, 0);
				ctx.restore();
			}
		}

		if (!this.endOfGame) {
			// Draw units and target
			for (var i = 0 ; i < this.units.length ; i++) {
				this.units[i].draw(ctx);
			}
			ctx.save();
			ctx.translate(this.targetpos.x * constant.tileSize, this.targetpos.y * constant.tileSize);
			ctx.drawImage(TankOp.images.target, 0, 0);
			ctx.restore();
		} else {
			// Draw end of game screen
			var endscreen = this.win ? TankOp.images.endgame_victory : TankOp.images.endgame_defeat;
			ctx.save();
			ctx.translate((constant.areaWidth - constant.endGameWidth) / 2, (constant.areaHeight - constant.endGameHeight) / 2);
			ctx.drawImage(endscreen, 0, 0);
			ctx.restore();
		}
	}
};

// Sound engine: plays one sound at a time
// (HTML5 audio, or the Media plugin in Android and iOS apps)
TankOp.Audio = function() {
	var userAgent = navigator.userAgent;
	this.isAndroid = /android/i.test(userAgent);
	this.isIOS = /iPad|iPhone|iPod/.test(userAgent);
	this.isCordova = (this.isAndroid || this.isIOS) && document.location.protocol.substr(0, 4) != "http";
	this.format = ".mp3";
	this.started = false;
	this.media = null;
	this.node = new Audio();
	this.node.preload = "auto";
	this.handleVolumeButtons();
};

TankOp.Audio.prototype = {
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

	// Play a sound, given without extension. It loops if loop is true.
	play: function(sound, loop) {
		var src = sound + this.format;
		if (this.isCordova) {
			this.playWithMedia(src, loop === true);
			return;
		}
		this.node.loop = (loop === true);
		this.node.src = src;
		this.started = false;
		var that = this;
		var promise = this.node.play();
		if (promise) {
			promise.then(function() {
				that.started = true;
			}).catch(function() {});
		} else {
			this.started = true;
		}
	},

	// HACK: HTML5 Audio don't work in PhoneGap on Android and iOS, use Media PhoneGap component instead
	playWithMedia: function(src, loop) {
		var path = location.pathname.substring(0, 1 + location.pathname.lastIndexOf("/")) + src;
		this.releaseMedia();
		var that = this;
		this.media = new Media(path, function() {}, function() {}, function(status) {
			if (loop && status == 4 && this.src != "") {
				that.playWithMedia(src, loop);
			}
		});
		this.media.play();
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
