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
		"sugar-tutorial": SugarTutorial
	},

	data: function() {
		return {
			state: FoodChain.state,
			// Screen displayed: "loading", "home", "credits", "LearnGame", "BuildGame" or "PlayGame"
			screen: "loading",
			level: 1
		};
	},

	created: function() {
		FoodChain.sound = new FoodChain.Audio();
		FoodChain.goHome = this.goHome;
	},

	methods: {
		onInitialized: function() {
			var vm = this;
			vm.activity = vm.$refs.SugarActivity.getActivity();
			vm.environment = vm.$refs.SugarActivity.getEnvironment();
			FoodChain.activity = vm.activity;

			// Language of the activity: the one of the user
			var defaultLanguage = (typeof chrome != "undefined" && chrome.app && chrome.app.runtime) ? chrome.i18n.getUILanguage() : navigator.language;
			var language = vm.environment.user ? vm.environment.user.language : defaultLanguage;
			vm.state.lang = FoodChain.languageFor(language);
			FoodChain.loadLanguage("en", function() {
				FoodChain.loadLanguage(vm.state.lang, function() {
					FoodChain.checkDatabase(function() {
						vm.start();
					});
				});
			});
		},

		// Display the home screen or the game saved in the journal
		start: function() {
			var vm = this;
			if (!vm.environment.objectId) {
				vm.screen = "home";
				return;
			}
			FoodChain.loadContext(function(context) {
				vm.screen = "home";
				if (!context) {
					return;
				}
				var finish = function() {
					if (context.score) vm.state.score = parseInt(context.score);
					if (context.game) {
						vm.playGame(context.game.replace("FoodChain.", ""), parseInt(context.level) || 1);
					}
				};
				if (context.language && FoodChain.languages.indexOf(context.language) != -1) {
					FoodChain.loadLanguage(context.language, function() {
						vm.state.lang = context.language;
						finish();
					});
				} else {
					finish();
				}
			});
		},

		goHome: function() {
			this.state.game = "";
			this.screen = "home";
		},

		// Launch a game
		playGame: function(name, level) {
			FoodChain.sound.pause();
			this.level = level || 1;
			this.screen = name;
		},

		setLanguage: function(lang) {
			FoodChain.setLanguage(lang);
		},

		onStop: function() {
			FoodChain.sound.pause();
			FoodChain.saveContext();
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
			var get = FoodChain.text;
			this.$refs.SugarTutorial.show(FoodChainTutorial.steps(get, this.state.game));
		}
	}
});

app.component("fc-shadow-button", FcShadowButton);
app.component("fc-status", FcStatus);
app.component("fc-card", FcCard);
app.component("fc-home", FcHome);
app.component("fc-credits", FcCredits);
app.component("fc-learn", FcLearn);
app.component("fc-build", FcBuild);
app.component("fc-play", FcPlay);

app.mount("#app");
