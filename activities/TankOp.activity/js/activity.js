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
		"tankop-home": TankOpHome,
		"tankop-credits": TankOpCredits,
		"tankop-lcd": TankOpLcd,
		"tankop-play": TankOpPlay
	},

	data: function() {
		return {
			state: TankOp.state,
			// Screen displayed: "home" or "play"
			screen: "home",
			level: 0,
			strings: {}
		};
	},

	created: function() {
		TankOp.sound = new TankOp.Audio();
		var vm = this;
		window.addEventListener("localized", function(e) {
			vm.strings = e.detail.l10n.dictionary || {};
		}, {once: true});
	},

	methods: {
		onInitialized: function() {
			var vm = this;
			vm.activity = vm.$refs.SugarActivity.getActivity();
			vm.environment = vm.$refs.SugarActivity.getEnvironment();
			if (vm.environment.objectId) {
				vm.activity.getDatastoreObject().loadAsText(function(error, metadata, data) {
					try {
						TankOp.setState(data ? JSON.parse(data) : null);
					} catch (e) {
						console.log("Can't read journal data", e);
					}
				});
			}
		},

		// Start the mission selected
		play: function() {
			TankOp.sound.pause();
			this.level = this.state.currentLevel;
			this.screen = "play";
		},

		// Back to the home screen, the mission is completed if won
		goHome: function(win) {
			if (win) {
				this.state.completed[this.level] = true;
				this.state.currentLevel = (this.state.currentLevel + 1) % TankOp.levels.length;
				this.save();
			}
			this.screen = "home";
		},

		// Save the missions completed in the journal
		save: function() {
			var object = this.activity.getDatastoreObject();
			object.setDataAsText(JSON.stringify(TankOp.getState()));
			object.getMetadata(function(error, metadata) {
				var completed = TankOp.state.completed.filter(function(done) {
					return done;
				}).length;
				metadata["score"] = completed + "/" + TankOp.levels.length;
				object.setMetadata(metadata);
				object.save(function() {});
			});
		},

		onStop: function() {
			TankOp.sound.pause();
			this.save();
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
			this.$refs.SugarTutorial.show(TankOpTutorial.steps(function(key) {
				return l10n.get(key);
			}, this.screen == "play"));
		}
	}
});

app.component("tankop-home", TankOpHome);
app.component("tankop-credits", TankOpCredits);
app.component("tankop-lcd", TankOpLcd);
app.component("tankop-play", TankOpPlay);

app.mount("#app");
