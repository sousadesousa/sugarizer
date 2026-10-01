// Search field of the toolbar
const VvSearchField = {
	template: `
		<div class="search-field-border" :class="focus ? 'search-field-border-focus' : 'search-field-border-nofocus'">
			<div class="search-field-iconsearch"></div>
			<input class="search-field-input" type="text" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" @focus="focus = true" @blur="focus = false">
			<div class="search-field-iconcancel" v-show="modelValue.length > 0" @click="$emit('update:modelValue', '')"></div>
		</div>
	`,
	props: { modelValue: { type: String, default: "" } },
	emits: ["update:modelValue"],
	data: function() {
		return { focus: false };
	}
};

// A video of the page: image, favorite mark and title
const VvItem = {
	template: `
		<div class="item" :id="id">
			<img v-show="!loaded" src="images/spinner-dark.gif" class="spinner">
			<img v-show="!loaded" class="itemImage" src="images/notloaded.png">
			<img v-show="loaded" class="itemImage" :src="image" @load="onLoad" @error="onError" @click="showVideo">
			<img v-show="loaded" class="itemPlay" :src="tojournal ? 'icons/tojournal.svg' : 'images/play.svg'" @click="showVideo">
			<img v-show="favorite" class="itemFavorite" src="icons/favorite.svg" @click="showVideo">
			<div class="itemOverlay"></div>
			<div class="itemTitle">{{ video.title }}</div>
		</div>
	`,
	props: { video: Object, favorite: Boolean, tojournal: Boolean, id: String },
	emits: ["video-played"],
	data: function() {
		return { loaded: false, failed: false };
	},
	computed: {
		image: function() {
			return this.failed ? "images/notloaded.png" : VV.imageURL(this.video);
		}
	},
	methods: {
		onLoad: function() {
			this.loaded = true;
		},

		// The image can't be loaded: show the default one
		onError: function() {
			this.failed = true;
			this.loaded = true;
		},

		videoURL: function() {
			return VV.videoURL(this.video);
		},

		// Save the video in the journal
		exportToVideo: function() {
			var mimetype = VV.constant.videoType == "mp4" ? "video/mp4" : "video/webm";
			var title = this.video.title;
			var request = new XMLHttpRequest();
			request.open("GET", this.videoURL(), true);
			request.setRequestHeader("Content-type", mimetype);
			request.responseType = "arraybuffer";
			request.onload = function() {
				if (request.status == 200 || request.status == 0) {
					var base64 = "data:" + mimetype + ";base64," + VV.toBase64(new Uint8Array(request.response));
					VV.datastore.create({
						mimetype: mimetype,
						title: title + "." + VV.constant.videoType,
						activity: "org.olpcfrance.MediaViewerActivity",
						timestamp: new Date().getTime(),
						creation_time: new Date().getTime(),
						file_size: 0
					}, function() {
						console.log("video '" + title + "' saved in journal.");
					}, base64);
				}
			};
			request.send();
		},

		showVideo: function() {
			if (this.tojournal) {
				this.exportToVideo();
			}
			this.$emit("video-played");
		}
	}
};

// The libraries to choose from
const VvLibraryDialog = {
	template: `
		<div class="vv-scrim" @click.self="$emit('close')">
			<div class="library-dialog">
				<div class="vv-library-list" :style="{height: height + 'px'}">
					<div class="library" v-for="(library, i) in libraries" :key="library.name + i">
						<img class="libraryImage" :src="images[i]" @error="failed(i)" @click="$emit('select', library)">
						<div class="libraryOverlay" @click="$emit('select', library)"></div>
						<div class="libraryTitle" @click="$emit('select', library)">{{ library.title }}</div>
						<img class="libraryIcon" src="icons/library.svg" @click="$emit('select', library)">
						<img class="libraryRemove" src="icons/list-remove.svg" @click="$emit('remove', library)">
					</div>
				</div>
				<img class="libraryAdd" src="icons/list-add.svg" @click="$emit('add')">
			</div>
		</div>
	`,
	props: { libraries: Array, height: Number },
	emits: ["close", "select", "remove", "add"],
	data: function() {
		return { broken: {} };
	},
	computed: {
		images: function() {
			var broken = this.broken;
			return this.libraries.map(function(library, i) {
				return broken[i] ? "images/nolibrary.png" : library.image;
			});
		}
	},
	methods: {
		failed: function(i) {
			this.broken[i] = true;
		}
	}
};

// Dialog to read a video
const VvVideoDialog = {
	template: `
		<div class="video-dialog">
			<div class="video-header toolbar">
				<button class="toolbutton video-favorite-button pull-left" title="Favorite" :style="{backgroundImage: 'url(icons/' + (favorite ? '' : 'not') + 'favorite.svg)'}" @click="toggleFavorite"></button>
				<div class="video-title">{{ video.title }}</div>
				<button class="toolbutton video-close-button pull-right" title="Close" @click="close"></button>
			</div>
			<video ref="video" class="video-item" :src="url" autoplay controls poster="images/notloaded.png" @loadedmetadata="restoreTime"></video>
		</div>
	`,
	props: { video: Object, favorite: Boolean },
	emits: ["close", "favorite"],
	computed: {
		url: function() {
			return VV.videoURL(this.video);
		}
	},
	mounted: function() {
		var node = this.$refs.video;
		// Inline playback on iOS
		if (/iPhone|iPad|iPod/.test(navigator.platform)) {
			node.setAttribute("playsinline", "playsinline");
			node.setAttribute("webkit-playsinline", "webkit-playsinline");
			node.playsInline = true;
		}
	},
	methods: {
		// Go on where the user stopped
		restoreTime: function() {
			var time = VV.getReadTime(this.video.id);
			if (time) {
				this.$refs.video.currentTime = time;
			}
		},

		toggleFavorite: function() {
			this.$emit("favorite", !this.favorite);
		},

		// Stop the video, remember where it was
		close: function() {
			var node = this.$refs.video;
			node.pause();
			VV.setReadTime(this.video.id, node.currentTime);
			node.removeAttribute("src");
			node.load();
			VV.saveContext();
			this.$emit("close");
		}
	}
};

// Dialog to add a library
const VvAddLibraryDialog = {
	template: `
		<div class="vv-scrim vv-scrim-center">
			<div class="module-dialog">
				<div class="toolbar">
					<div class="module-icon"></div>
					<div class="module-text">Add library</div>
					<button class="toolbutton module-cancel-button" title="Cancel" @click="$emit('close')"></button>
					<button class="toolbutton module-ok-button" title="OK" @click="ok"></button>
				</div>
				<div class="server-message">Library description URL:</div>
				<div class="server-content">
					<div class="server-httplabel">http://</div>
					<input ref="servername" class="server-servername" type="text" v-model="address" @keydown.enter="ok">
				</div>
			</div>
		</div>
	`,
	emits: ["close", "added"],
	data: function() {
		return { address: "" };
	},
	mounted: function() {
		this.$refs.servername.focus();
	},
	methods: {
		ok: function() {
			var url = "http://" + this.address;
			var vm = this;
			vm.$emit("close");
			requirejs(["lib/axios.min.js"], function(axios) {
				axios.get(url).then(function(response) {
					var library = response.data;
					if (!library.name || !library.image || !library.title || !library.database || !library.images) {
						console.log("Incorrect format for library '" + url + "'");
						return;
					}
					VV.addLibrary(library);
					VV.saveContext();
					vm.$emit("added");
				}).catch(function() {
					console.log("Unable to load '" + url + "'");
				});
			});
		}
	}
};
