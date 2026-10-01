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
		"tamtam-item": TamTamItem,
		"tamtam-collection": TamTamCollection,
		"tamtam-piano": TamTamPiano,
		"tamtam-simon": TamTamSimon
	},

	data: function() {
		return {
			state: TamTam.state,
			collections: TamTam.collections,
			fullscreen: false,
			contentHeight: 0,
			strings: {}
		};
	},

	computed: {
		// Instruments of the selected collection
		items: function() {
			return TamTam.collections[this.state.collection].content;
		},
		background: function() {
			return this.state.mode == "instruments" ? this.state.userColor.fill : "#ffffff";
		}
	},

	watch: {
		background: {
			immediate: true,
			handler: function(color) {
				document.body.style.backgroundColor = color;
			}
		}
	},

	created: function() {
		TamTam.tonePlayer = new TamTam.TonePlayer();
		var vm = this;
		window.addEventListener("localized", function(e) {
			vm.strings = e.detail.l10n.dictionary || {};
		}, {once: true});
		window.addEventListener("resize", this.computeSize);
	},

	beforeUnmount: function() {
		window.removeEventListener("resize", this.computeSize);
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
			if (vm.environment.user && vm.environment.user.colorvalue) {
				vm.state.userColor = vm.environment.user.colorvalue;
			}
			vm.computeSize();

			// Load from the journal
			if (vm.environment.objectId) {
				vm.activity.getDatastoreObject().loadAsText(function(error, metadata, data) {
					if (error == null && data != null) {
						try {
							vm.setContext(JSON.parse(data));
						} catch (e) {
							console.log("Can't read journal data", e);
						}
					}
				});
			}
		},

		// The content takes the height left by the toolbar
		computeSize: function() {
			var toolbar = document.getElementById("main-toolbar");
			var toolbarHeight = (!this.fullscreen && toolbar) ? toolbar.offsetHeight : 0;
			this.contentHeight = window.innerHeight - toolbarHeight;
		},

		setMode: function(mode) {
			this.state.mode = mode;
		},

		setFullscreen: function(fullscreen) {
			this.fullscreen = fullscreen;
			if (fullscreen) {
				this.$refs.SugarToolbar.hide();
			} else {
				this.$refs.SugarToolbar.show();
			}
			var vm = this;
			this.$nextTick(function() {
				vm.computeSize();
			});
		},

		setContext: function(context) {
			this.state.mode = context.piano ? "piano" : (context.simon ? "simon" : "instruments");
			if (context.currentPianoMode) {
				this.state.currentPiano = context.currentPianoMode;
			}
			if (context.currentSimonMode) {
				this.state.currentSimon = context.currentSimonMode;
			}
		},

		getContext: function() {
			return {
				piano: this.state.mode == "piano",
				currentPianoMode: this.state.currentPiano,
				simon: this.state.mode == "simon",
				currentSimonMode: this.state.currentSimon
			};
		},

		onStop: function() {
			var object = this.activity.getDatastoreObject();
			object.setDataAsText(JSON.stringify(this.getContext()));
			object.save(function(error) {
				console.log(error === null ? "write done." : "write failed.");
			});
		},

		onHelp: function() {
			var l10n = this.$refs.SugarL10n;
			var current = this.state.mode == "simon" ? this.state.currentSimon : this.state.currentPiano;
			this.$refs.SugarTutorial.show(TamTamTutorial.steps(function(key) {
				return l10n.get(key);
			}, this.state.mode, current));
		}
	}
});

app.mount("#app");
