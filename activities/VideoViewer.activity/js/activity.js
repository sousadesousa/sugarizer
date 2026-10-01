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
		"vv-search-field": VvSearchField,
		"vv-item": VvItem,
		"vv-library-dialog": VvLibraryDialog,
		"vv-video-dialog": VvVideoDialog,
		"vv-add-library-dialog": VvAddLibraryDialog
	},

	data: function() {
		return {
			state: VV.state,
			context: VV.state.context,
			// Position in the videos of the filter
			index: 0,
			loading: false,
			failed: false,
			fullscreen: false,
			exportMode: false,
			librariesShown: false,
			addDialog: false,
			// Video displayed
			video: null,
			background: "#cecfce",
			contentHeight: 300
		};
	},

	computed: {
		favorites: function() {
			return this.context.favorites;
		},

		// The search text is kept in the filter of the context
		text: {
			get: function() {
				return this.context.filter.text;
			},
			set: function(value) {
				this.context.filter.text = value;
			}
		},

		collection: function() {
			// The videos, the favorites and the filter are listed to follow their changes
			return VV.getCollection();
		},

		pageVideos: function() {
			return this.collection.slice(this.index, this.index + VV.constant.pageCount);
		},

		lastPage: function() {
			return Math.ceil(this.collection.length / VV.constant.pageCount);
		},

		currentPage: function() {
			return (this.collection.length ? 1 : 0) + Math.ceil(this.index / VV.constant.pageCount);
		},

		hasPrevious: function() {
			return this.index - VV.constant.pageCount >= 0;
		},

		hasNext: function() {
			return this.currentPage < this.lastPage;
		}
	},

	watch: {
		// A new filter starts at the first page
		"context.filter.category": function() {
			this.filterChanged();
		},
		"context.filter.favorite": function() {
			this.filterChanged();
		},
		"context.filter.text": function() {
			this.filterChanged();
		},
		"context.library": function() {
			this.setPaletteFilter();
		},
		"state.categories": function() {
			this.setCategories();
		}
	},

	mounted: function() {
		window.addEventListener("resize", this.computeSize);
		window.addEventListener("keydown", this.onKeyDown);
	},

	methods: {
		onInitialized: function() {
			var vm = this;
			vm.activity = vm.$refs.SugarActivity.getActivity();
			vm.environment = vm.$refs.SugarActivity.getEnvironment();
			VV.activity = vm.activity;
			requirejs(["sugar-web/datastore"], function(datastore) {
				VV.datastore = datastore;
			});
			if (vm.environment.user) {
				if (vm.environment.user.colorvalue) {
					vm.background = vm.environment.user.colorvalue.fill;
				}
				if (vm.environment.user.language) {
					VV.state.language = vm.environment.user.language;
				}
			}
			vm.computeSize();

			// Load the context saved, or the list of libraries
			if (vm.environment.objectId) {
				vm.activity.getDatastoreObject().loadAsText(function(error, metadata, data) {
					var saved = null;
					try {
						saved = JSON.parse(data);
					} catch (e) {
					}
					if (saved && saved.library) {
						Object.assign(VV.state.context, saved);
						vm.loadDatabase(saved.currentindex);
					} else {
						vm.loadLibraries();
					}
				});
			} else {
				vm.loadLibraries();
			}
		},

		// Size of the list of videos: the screen without toolbar and footer
		computeSize: function() {
			var toolbar = document.getElementById("main-toolbar");
			var toolbarHeight = toolbar && toolbar.offsetHeight ? toolbar.offsetHeight : 0;
			this.contentHeight = Math.max(100, window.innerHeight - (toolbarHeight + 55));
		},

		loadLibraries: function() {
			var vm = this;
			vm.loading = true;
			VV.loadLibraries(function(error) {
				vm.loading = false;
				vm.failed = !!error;
				if (!error) {
					vm.librariesShown = true;
				}
			});
		},

		loadDatabase: function(index) {
			var vm = this;
			vm.loading = true;
			VV.loadDatabase(function(error) {
				vm.loading = false;
				vm.failed = !!error;
				if (!error) {
					vm.setCategories();
					vm.setPaletteFilter();
					// Go on at the page of the last visit
					vm.index = index && index < vm.collection.length ? index - (index % VV.constant.pageCount) : 0;
				}
			});
		},

		// Categories in the palette of the filter button
		setCategories: function() {
			var palette = this.$refs.filterItem && this.$refs.filterItem.paletteObject;
			if (palette) {
				palette.setCategories(VV.state.categories);
				this.setPaletteFilter();
			} else {
				// The palette is not loaded yet
				setTimeout(this.setCategories, 100);
			}
		},

		// Select the category of the filter in the palette
		setPaletteFilter: function() {
			var palette = this.$refs.filterItem && this.$refs.filterItem.paletteObject;
			var category = this.context.filter.category;
			if (!palette || !category || palette.getFilter() == category) {
				return;
			}
			var button = palette.buttons.find(function(button) {
				return button.id == category;
			});
			if (button) {
				button.className = "toolbutton palette-button palette-button-selected filter-item";
			}
		},

		onFilter: function(event, palette) {
			VV.setFilter({ category: palette.getFilter() });
			VV.saveContext();
			palette.popDown();
		},

		toggleFavorites: function() {
			VV.setFilter({ favorite: !this.context.filter.favorite });
		},

		filterChanged: function() {
			this.index = 0;
			this.saveIndex();
		},

		showLibraries: function() {
			this.librariesShown = true;
		},

		// The user must choose a library when there is none
		hideLibraries: function() {
			if (this.context.library != null) {
				this.librariesShown = false;
			}
		},

		selectLibrary: function(library) {
			this.context.library = library;
			this.librariesShown = false;
			VV.setFilter({ category: "", text: "", favorite: false });
			this.index = 0;
			this.saveIndex();
			this.loadDatabase(0);
		},

		removeLibrary: function(library) {
			VV.removeLibrary(library);
			VV.saveContext();
		},

		playVideo: function(video) {
			if (this.exportMode) {
				this.exportMode = false;
				return;
			}
			this.video = video;
		},

		setFavorite: function(value) {
			VV.setFavorite(this.video.id, value);
			VV.saveContext();
		},

		saveIndex: function() {
			this.context.currentindex = this.index;
			VV.saveContext();
		},

		showPrevious: function() {
			this.index -= VV.constant.pageCount;
			this.saveIndex();
		},

		showNext: function() {
			this.index += VV.constant.pageCount;
			this.saveIndex();
		},

		onKeyDown: function(event) {
			if (this.video || this.librariesShown || this.addDialog || event.target.tagName == "INPUT") {
				return;
			}
			if (event.key === "ArrowLeft" && this.hasPrevious) {
				this.showPrevious();
			} else if (event.key === "ArrowRight" && this.hasNext) {
				this.showNext();
			}
		},

		setFullscreen: function(fullscreen) {
			this.fullscreen = fullscreen;
			if (fullscreen) {
				this.$refs.SugarToolbar.hide();
			} else {
				this.$refs.SugarToolbar.show();
			}
			var vm = this;
			vm.$nextTick(vm.computeSize);
		},

		onHelp: function() {
			var l10n = this.$refs.SugarL10n;
			this.$refs.SugarTutorial.show(VideoViewerTutorial.steps(function(key) {
				return l10n.get(key);
			}));
		}
	}
});

app.mount("#app");
