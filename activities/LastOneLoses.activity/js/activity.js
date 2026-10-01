// Rebase require directory
requirejs.config({
	baseUrl: "lib",
	// Load templates with XHR even when Electron exposes Node.js to the page
	config: {
		text: {
			env: "xhr"
		}
	},
	paths: {
		activity: "../js"
	}
});

const app = Vue.createApp({
	components: {
		"sugar-activity": SugarActivity,
		"sugar-toolbar": SugarToolbar,
		"sugar-toolitem": SugarToolitem,
		"sugar-localization": SugarLocalization,
		"sugar-popup": SugarPopup,
		"sugar-tutorial": SugarTutorial,
		"lol-item": LolItem
	},

	data: function() {
		return {
			state: LOL.state,
			// Number of items at the start of a game, and left to play
			size: 13,
			count: 13,
			// Level of the computer: 1 easy, 2 medium, 3 hard
			level: 1,
			// Player of the user (0), the other one is the computer or the opponent
			player: 0,
			// Game state, copied from the game object so the screen follows it
			length: 13,
			turn: 0,
			ended: false,
			// Items selected by the player
			selected: [],
			// Network: shared activity, host or guest, opponent
			shared: false,
			isHost: false,
			opponent: null,
			// Number of opponents that joined the game, for the host
			players: 0,
			strings: {}
		};
	},

	computed: {
		selectedCount: function() {
			return this.selected.filter(function(item) {
				return item;
			}).length;
		},

		// The user plays now
		myTurn: function() {
			return this.turn == this.player && !this.ended;
		},

		// The computer or the opponent plays now
		otherTurn: function() {
			return this.turn != this.player && !this.ended;
		},

		// The game is won by the user
		won: function() {
			return this.turn != this.player;
		},

		// The new game and switch player buttons are only for the host
		onlyHost: function() {
			return this.shared && !this.isHost;
		},

		switchDisabled: function() {
			return this.onlyHost || this.length != this.size;
		},

		// Class of the message at the end of the game
		endClass: function() {
			if (this.shared) {
				return this.won ? "end-message-win" : "player-lost";
			}
			return this.won ? "end-message-win" : "end-message-lost";
		}
	},

	created: function() {
		this.endSound = new Audio();
		this.endSound.preload = "auto";
		this.timer = null;
		// Exposed to test the network messages
		LOL.app = this;
		this.game = new LOLGame(this.count);
		this.init();
	},

	methods: {
		// Localized string
		text: function(key, params) {
			return this.$refs.SugarL10n ? this.$refs.SugarL10n.get(key, params) : key;
		},

		onInitialized: function() {
			var vm = this;
			vm.activity = vm.$refs.SugarActivity.getActivity();
			vm.environment = vm.$refs.SugarActivity.getEnvironment();
			if (vm.environment.user && vm.environment.user.colorvalue) {
				vm.state.userColor = vm.environment.user.colorvalue;
			}

			// Shared instance: the user joins a game
			if (vm.environment.sharedId) {
				console.log("Shared instance");
				vm.shared = true;
				vm.presence = vm.activity.getPresenceObject(function(error, network) {
					network.listSharedActivityUsers(vm.environment.sharedId, function(users) {
						for (var i = 0 ; i < users.length ; i++) {
							if (users[i].networkId != network.getUserInfo().networkId) {
								vm.opponent = users[i];
								break;
							}
						}
					});
					network.onDataReceived(vm.onNetworkDataReceived);
					network.onSharedActivityUserChanged(vm.onNetworkUserChanged);
				});
			} else {
				vm.load();
			}
			vm.drawBoard();
		},

		// Init game
		init: function() {
			this.game = new LOLGame(this.count);
			if (this.count > 0) {
				this.player = this.game.getPlayer();
			}
			this.count = this.size;
		},

		// Update the screen from the game
		drawBoard: function() {
			var game = this.game;
			window.clearInterval(this.timer);
			this.length = game.getLength();
			this.turn = game.getPlayer();
			this.ended = game.endOfGame();
			this.selected = [];
			for (var i = 0 ; i < this.length ; i++) {
				this.selected.push(false);
			}
			this.showCurrentPlayer();

			// Test end condition
			if (this.ended) {
				this.endSound.src = this.won ? "audio/applause.mp3" : "audio/disappointed.mp3";
				var promise = this.endSound.play();
				if (promise) {
					promise.catch(function() {});
				}
				return;
			}

			// Play for the computer or the opponent
			if (this.turn != this.player) {
				if (this.shared && this.opponent != null) {
					this.showOpponent();
				} else {
					this.computerPlay();
				}
			}
		},

		// Colorize the icon of a player with its colors, once the screen is updated
		colorize: function(ref, color) {
			var vm = this;
			this.$nextTick(function() {
				var node = vm.$refs[ref];
				if (node && color) {
					requirejs(["sugar-web/graphics/icon"], function(icon) {
						icon.colorize(node, color, function() {});
					});
				}
			});
		},

		showCurrentPlayer: function() {
			if (this.myTurn) {
				this.colorize("player", this.state.userColor);
			}
		},

		// The opponent plays, his icon has his colors
		showOpponent: function() {
			if (this.otherTurn) {
				this.colorize("computer", this.opponent ? this.opponent.colorvalue : null);
			}
		},

		// Level of the computer
		getLevel: function() {
			return this.level;
		},

		setLevel: function(level) {
			if (!this.shared) {
				this.level = level;
			}
		},

		// Select an item
		selectItem: function(index) {
			if (!this.myTurn) {
				return;
			}
			var value = this.selected[index];
			if (this.selectedCount == 3 && !value) {
				return;
			}
			this.selected[index] = !value;
		},

		// Switch player: the opponent begins the game
		switchPlayer: function() {
			this.game.reverse();
			this.drawBoard();
			if (this.presence) {
				this.presence.sendMessage(this.presence.getSharedInfo().id, {
					user: this.presence.getUserInfo(),
					action: "update",
					content: 0
				});
			}
		},

		// Play for the player
		doPlay: function() {
			if (!this.myTurn || this.selectedCount == 0) {
				return;
			}
			var shot = this.selectedCount;
			this.save(this.game.play(shot));
			if (this.presence) {
				this.presence.sendMessage(this.presence.getSharedInfo().id, {
					user: this.presence.getUserInfo(),
					action: "update",
					content: shot
				});
			}
			this.drawBoard();
		},

		// Let the computer play: it thinks and takes some items, then plays
		computerPlay: function() {
			if (this.turn == this.player) {
				return;
			}
			var vm = this;
			var step = 0;
			// The computer has its own icon, not the one of an opponent
			if (this.$refs.computer) {
				this.$refs.computer.removeAttribute("style");
			}
			this.timer = window.setInterval(function() {
				if (step == 0) {
					// First, think to the shot and select items
					step = 2;
					var shot = vm.game.think(vm.getLevel());
					for (var i = 0 ; i < shot ; i++) {
						vm.selected[i] = true;
					}
				} else {
					// Then play
					window.clearInterval(vm.timer);
					vm.save(vm.game.play(vm.selectedCount));
					vm.drawBoard();
				}
			}, 400 + 50 * this.getLevel());
		},

		// The opponent takes some items
		doOpponent: function(shot) {
			var vm = this;
			for (var i = 0 ; i < shot && i < this.selected.length ; i++) {
				this.selected[i] = true;
			}
			window.setTimeout(function() {
				vm.game.play(shot);
				vm.drawBoard();
			}, 400);
		},

		// Start a new game
		doRenew: function() {
			this.level = this.getLevel();
			this.game = new LOLGame(this.count);
			this.init();
			this.drawBoard();
			if (this.presence && this.isHost) {
				this.presence.sendMessage(this.presence.getSharedInfo().id, {
					user: this.presence.getUserInfo(),
					action: "init",
					content: this.game.getLength()
				});
			}
		},

		// Load game from the journal
		load: function() {
			var vm = this;
			if (!vm.environment.objectId) {
				return;
			}
			vm.activity.getDatastoreObject().loadAsText(function(error, metadata, data) {
				var saved = null;
				try {
					saved = data ? JSON.parse(data) : null;
				} catch (e) {
					saved = null;
				}
				if (saved == null) {
					return;
				}
				vm.size = saved.size;
				vm.count = saved.count;
				vm.level = saved.level;
				vm.player = saved.player;
				vm.init();
				vm.drawBoard();
			});
		},

		// Save game in the journal
		save: function(count) {
			var object = this.activity.getDatastoreObject();
			object.setDataAsText(JSON.stringify({size: this.size, count: count, level: this.getLevel(), player: this.game.getPlayer()}));
			object.save(function() {});
		},

		// Share the game on the network, the user is the host
		onShared: function(event, paletteObject) {
			var vm = this;
			paletteObject.popDown();
			console.log("Want to share");
			vm.presence = vm.activity.getPresenceObject(function(error, network) {
				if (error) {
					console.log("Sharing error");
					return;
				}
				network.createSharedActivity("org.olpc-france.LOLActivity", function() {
					console.log("Activity shared");
					vm.shared = true;
					vm.isHost = true;
					vm.drawBoard();
				});
				network.onDataReceived(vm.onNetworkDataReceived);
				network.onSharedActivityUserChanged(vm.onNetworkUserChanged);
			});
		},

		// Close the activity
		closeActivity: function() {
			var stopEvent = document.createEvent("CustomEvent");
			stopEvent.initCustomEvent("activityStop", false, false, {
				"cancelable": true
			});
			if (window.dispatchEvent(stopEvent)) {
				this.activity.close();
			}
		},

		onNetworkDataReceived: function(msg) {
			if (this.presence.getUserInfo().networkId === msg.user.networkId) {
				return;
			}
			switch (msg.action) {
			case "init":
				// The host starts a game: the guest plays second
				this.game = new LOLGame(msg.content);
				this.game.reverse();
				this.opponent = msg.user;
				this.drawBoard();
				break;
			case "update":
				if (msg.content > 0) {
					this.doOpponent(msg.content);
				} else {
					this.game.reverse();
					this.drawBoard();
				}
				break;
			case "exit":
				// Already two players
				if (msg.content == this.presence.getUserInfo().networkId) {
					this.closeActivity();
				}
				break;
			}
		},

		onNetworkUserChanged: function(msg) {
			var icon = "<img style='height:30px;' src='" + LOL.xoLogoWithColor(msg.user.colorvalue) + "'>";
			this.$refs.SugarPopup.log(icon + this.text(msg.move == 1 ? "PlayerJoin" : "PlayerLeave", {user: msg.user.name}));
			console.log("User " + msg.user.name + " " + (msg.move == 1 ? "join" : "leave"));
			if (msg.move == 1) {
				if (this.isHost) {
					if (this.players == 0) {
						this.presence.sendMessage(this.presence.getSharedInfo().id, {
							user: this.presence.getUserInfo(),
							action: "init",
							content: this.game.getLength()
						});
						this.players = 1;
						this.opponent = msg.user;
					} else {
						this.presence.sendMessage(this.presence.getSharedInfo().id, {
							user: this.presence.getUserInfo(),
							action: "exit",
							content: msg.user.networkId
						});
					}
				}
			} else if (this.opponent && msg.user.networkId == this.opponent.networkId) {
				this.players--;
				this.opponent = null;
				this.drawBoard();
			}
		},

		setFullscreen: function(fullscreen) {
			this.state.fullscreen = fullscreen;
			if (fullscreen) {
				this.$refs.SugarToolbar.hide();
			} else {
				this.$refs.SugarToolbar.show();
			}
		},

		onHelp: function() {
			var l10n = this.$refs.SugarL10n;
			this.$refs.SugarTutorial.show(LOLTutorial.steps(function(key) {
				return l10n.get(key);
			}));
		}
	}
});

app.mount("#app");
