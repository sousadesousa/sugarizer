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
			state: Abcd.state,
			// Screen displayed: "loading", "home", "learn" or "play"
			screen: "loading",
			screenContext: "",
			showCredits: false,
			strings: {}
		};
	},

	computed: {
		// The export buttons of the Learn screen
		showExport: function() {
			return this.screen == "learn" && this.state.learnEntries;
		}
	},

	created: function() {
		var vm = this;
		Abcd.sound = new Abcd.Audio();
		Abcd.goHome = function() {
			vm.goHome();
		};
		window.addEventListener("localized", function(e) {
			Abcd.l10n = e.detail.l10n;
			vm.strings = e.detail.l10n.dictionary || {};
		}, {once: true});
	},

	methods: {
		// Localized string
		t: function(key) {
			return this.strings[key] || "";
		},

		onInitialized: function() {
			var vm = this;
			vm.activity = vm.$refs.SugarActivity.getActivity();
			vm.environment = vm.$refs.SugarActivity.getEnvironment();
			Abcd.popup = vm.$refs.SugarPopup;
			requirejs(["sugar-web/datastore"], function(datastore) {
				Abcd.datastore = datastore;
			});

			// Content language
			var defaultLanguage = (typeof chrome != "undefined" && chrome.app && chrome.app.runtime) ? chrome.i18n.getUILanguage() : navigator.language;
			var language = vm.environment.user ? vm.environment.user.language : defaultLanguage;
			vm.state.lang = Abcd.contentLanguage(language);

			Abcd.loadDatabase(function(error) {
				if (error) {
					vm.screen = "home";
					return;
				}
				vm.loadContext(function(context) {
					Abcd.checkDatabase(function() {
						vm.screen = "home";
						if (context) {
							vm.restartLastGame(context);
						}
					});
				});
			});
		},

		// Context of the last use: "screen#language#case#screen context"
		loadContext: function(callback) {
			if (!this.environment.objectId) {
				callback(null);
				return;
			}
			var vm = this;
			this.activity.getDatastoreObject().loadAsText(function(error, metadata, data) {
				var context = null;
				try {
					context = data ? JSON.parse(data) : null;
				} catch (e) {
					context = null;
				}
				if (context && typeof context.context == "string") {
					var values = context.context.split("#");
					if (Abcd.languages.indexOf(values[1]) != -1) {
						vm.state.lang = values[1];
					}
					vm.state.casevalue = parseInt(values[2]) || 0;
					context = { screen: values[0], screenContext: values.slice(3).join("#") };
				} else {
					context = null;
				}
				callback(context);
			});
		},

		// Start the last closed screen
		restartLastGame: function(context) {
			if (context.screen == "Abcd.Learn" || context.screen == "Abcd.Play") {
				Abcd.sound.pause();
				this.screenContext = context.screenContext;
				this.screen = context.screen == "Abcd.Learn" ? "learn" : "play";
			}
		},

		goHome: function() {
			if (this.screen == "home") {
				return;
			}
			this.screen = "home";
			this.screenContext = "";
		},

		openScreen: function(screen) {
			if (!this.state.databaseLoaded) {
				return;
			}
			Abcd.sound.pause();
			this.screenContext = "";
			this.screen = screen;
		},

		onStop: function() {
			Abcd.sound.pause();
			var current = this.$refs.screen;
			var values = [
				this.screen == "learn" ? "Abcd.Learn" : (this.screen == "play" ? "Abcd.Play" : ""),
				this.state.lang,
				this.state.casevalue,
				current && current.saveContext ? current.saveContext() : ""
			];
			var object = this.activity.getDatastoreObject();
			object.setDataAsText(JSON.stringify({context: values.join("#"), database: Abcd.getDatabase()}));
			object.save(function() {});
		},

		onHelp: function() {
			var l10n = this.$refs.SugarL10n;
			this.$refs.SugarTutorial.show(AbcdTutorial.steps(function(key) {
				return l10n.get(key);
			}, this.screen));
		},

		toggleExport: function(mode) {
			this.state.tojournal = this.state.tojournal == mode ? 0 : mode;
		},

		setFullscreen: function(fullscreen) {
			this.state.fullscreen = fullscreen;
			if (fullscreen) {
				this.$refs.SugarToolbar.hide();
			} else {
				this.$refs.SugarToolbar.show();
			}
		}
	}
});

app.component("abcd-entry", AbcdEntry);
app.component("abcd-theme", AbcdTheme);
app.component("abcd-collection", AbcdCollection);
app.component("abcd-letter", AbcdLetter);
app.component("abcd-home-button", AbcdHomeButton);
app.component("abcd-case-button", AbcdCaseButton);
app.component("abcd-language-button", AbcdLanguageButton);
app.component("abcd-play-type-button", AbcdPlayTypeButton);
app.component("abcd-home", AbcdHome);
app.component("abcd-credits", AbcdCredits);
app.component("abcd-filter", AbcdFilter);
app.component("abcd-learn", AbcdLearn);
app.component("abcd-play", AbcdPlay);

app.mount("#app");
