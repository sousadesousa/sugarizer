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

// Pen and eraser sizes
var sizes = [5, 10, 15, 20];

const app = Vue.createApp({
	components: {
		"sugar-activity": SugarActivity,
		"sugar-toolbar": SugarToolbar,
		"sugar-toolitem": SugarToolitem,
		"sugar-localization": SugarLocalization,
		"sugar-popup": SugarPopup,
		"sugar-tutorial": SugarTutorial
	},

	mixins: [PaintCollaboration],

	data: function() {
		var stampBase = "stamps/heart-{platform}.svg";
		return {
			mode: "Pen",
			sizes: sizes,
			size: sizes[0],
			fillColor: "rgb(255, 43, 52)",
			strokeColor: "rgb(0, 95, 228)",
			stamp: {
				stampBase: stampBase,
				stamp: stampBase.replace("{platform}", stampPlatform()),
				proportionnal: true
			},
			text: {
				text: "Paint",
				fontFamily: "Arial",
				lineHeight: "0.7"
			},
			undoCount: 0,
			redoCount: 0,
			strings: {}
		};
	},

	computed: {
		// Only the host can undo and redo in a shared activity
		canUndo: function() {
			return (!this.isShared || this.isHost) && this.undoCount > 1;
		},
		canRedo: function() {
			return (!this.isShared || this.isHost) && this.redoCount > 0;
		}
	},

	created: function() {
		var vm = this;
		// Not reactive: images and DOM elements
		vm.history = {
			limit: 15,
			undo: [],
			redo: []
		};
		vm.currentElement = null;
		vm.pasteImage = null;
		vm.pointerId = null;
		window.addEventListener("localized", function(e) {
			vm.strings = e.detail.l10n.dictionary || {};
			vm.withPalette("filtersItem", function(palette) {
				palette.localize(vm.t);
			});
		}, {once: true});
	},

	mounted: function() {
		this.canvas = this.$refs.canvas;
		var width = window.innerWidth;
		var height = window.innerHeight - this.canvasTop();
		var ratio = window.devicePixelRatio;
		this.canvas.style.width = width + "px";
		this.canvas.style.height = height + "px";
		this.canvas.width = width * ratio;
		this.canvas.height = height * ratio;
		this.context().scale(ratio, ratio);
		this.clearCanvas();
	},

	methods: {
		// Localized string
		t: function(key) {
			return this.strings[key] || "";
		},

		// Call a function with the palette object of a toolbar item, once it is loaded
		withPalette: function(ref, callback) {
			var item = this.$refs[ref];
			if (item.paletteObject) {
				callback(item.paletteObject);
				return;
			}
			var unwatch = this.$watch(function() {
				return item.paletteObject;
			}, function(palette) {
				if (palette) {
					unwatch();
					callback(palette);
				}
			});
		},

		onInitialized: function() {
			var vm = this;
			vm.activity = vm.$refs.SugarActivity.getActivity();
			vm.environment = vm.$refs.SugarActivity.getEnvironment();
			requirejs(["lzstring", "sugar-web/datastore"], function(LZString, datastore) {
				vm.LZString = LZString;
				vm.datastore = datastore;
				if (vm.environment.sharedId) {
					// Joining a shared activity
					vm.isHost = false;
					vm.shareActivity();
				} else if (vm.environment.objectId) {
					vm.loadFromJournal();
				}
			});
		},

		// Drawings are saved as {width, height, src} with src the compressed data URL of the canvas
		loadFromJournal: function() {
			var vm = this;
			vm.activity.getDatastoreObject().loadAsText(function(error, metadata, text) {
				if (error || !text) {
					return;
				}
				var data = JSON.parse(text);
				vm.clearCanvas();
				var img = new Image();
				img.onload = function() {
					vm.context().drawImage(img, 0, 0, data.width, data.height);
					vm.saveCanvas();
				};
				img.src = vm.decompress(data.src);
			});
		},

		onStop: function() {
			var object = this.activity.getDatastoreObject();
			object.setDataAsText(JSON.stringify(this.canvasData()));
			object.save(function() {});
		},

		onHelp: function() {
			var l10n = this.$refs.SugarL10n;
			this.$refs.SugarTutorial.show(PaintTutorial.steps(function(key) {
				return l10n.get(key);
			}));
		},

		context: function() {
			return this.canvas.getContext("2d");
		},

		// Position of the canvas in the page, below the toolbar
		canvasTop: function() {
			return this.$refs.canvas.getBoundingClientRect().top;
		},

		// Pointer (mouse, touch or pen) on the canvas, sent to the current mode
		pointerPosition: function(event) {
			var rect = this.canvas.getBoundingClientRect();
			return {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			};
		},

		onPointerDown: function(event) {
			if (this.pointerId !== null || !event.isPrimary || (event.pointerType == "mouse" && event.button !== 0)) {
				return;
			}
			this.pointerId = event.pointerId;
			this.canvas.setPointerCapture(event.pointerId);
			PaintModes[this.mode].onMouseDown(this, this.pointerPosition(event));
		},

		onPointerMove: function(event) {
			if (event.pointerId !== this.pointerId) {
				return;
			}
			PaintModes[this.mode].onMouseDrag(this, this.pointerPosition(event));
		},

		onPointerUp: function(event) {
			if (event.pointerId !== this.pointerId) {
				return;
			}
			this.pointerId = null;
			PaintModes[this.mode].onMouseUp(this, this.pointerPosition(event));
		},

		setMode: function(mode) {
			this.saveCanvas();
			this.mode = mode;
			// The selection of the copy mode stays for the paste mode
			if (this.currentElement && !(this.currentElement.type == "copy/paste" && (mode == "Copy" || mode == "Paste"))) {
				this.removeFloatingElement();
			}
		},

		nextSize: function() {
			this.size = sizes[(sizes.indexOf(this.size) + 1) % sizes.length];
		},

		// Remove the element floating over the canvas (copy selection, stamp, text)
		removeFloatingElement: function() {
			if (this.currentElement) {
				this.currentElement.element.remove();
				this.currentElement = null;
			}
		},

		clearCanvas: function() {
			var ctx = this.context();
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(0, 0, parseInt(this.canvas.style.width), parseInt(this.canvas.style.height));
			this.saveCanvas();
		},

		clear: function() {
			this.clearCanvas();
			if (this.isShared) {
				this.sendMessage({action: "clearCanvas"});
			}
		},

		// Store the canvas in the history
		saveCanvas: function() {
			var history = this.history;
			var image = this.canvas.toDataURL();
			if (history.undo[history.undo.length - 1] !== image) {
				history.undo.push(image);
				history.redo = [];
			}
			if (history.undo.length > history.limit) {
				history.undo.shift();
			}
			this.updateHistory();

			// Not the host of a shared activity: ask the host to save its canvas
			if (this.isShared && !this.isHost) {
				this.sendMessage({action: "saveCanvas"});
			}
		},

		updateHistory: function() {
			this.undoCount = this.history.undo.length;
			this.redoCount = this.history.redo.length;
		},

		// Draw an image of the history
		restoreCanvas: function(src) {
			var vm = this;
			var img = new Image();
			img.onload = function() {
				var ctx = vm.context();
				ctx.save();
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, vm.canvas.width, vm.canvas.height);
				ctx.drawImage(img, 0, 0);
				ctx.restore();
				vm.broadcastCanvas();
			};
			img.src = src;
		},

		undo: function() {
			this.removeFloatingElement();
			var history = this.history;
			if (!this.canUndo) {
				return;
			}
			history.redo.push(history.undo.pop());
			if (history.redo.length > history.limit) {
				history.redo.shift();
			}
			this.restoreCanvas(history.undo[history.undo.length - 1]);
			this.updateHistory();
		},

		redo: function() {
			this.removeFloatingElement();
			var history = this.history;
			if (!this.canRedo) {
				return;
			}
			var src = history.redo.pop();
			history.undo.push(src);
			this.restoreCanvas(src);
			this.updateHistory();
		},

		applyFilter: function(filter) {
			this.saveCanvas();
			var ctx = this.context();
			var image = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
			PaintFilters[filter](image.data);
			ctx.putImageData(image, 0, 0);
			this.saveCanvas();
			this.broadcastCanvas();
		},

		// Replace the canvas by a drawing of the drawings palette
		loadDrawing: function(url) {
			var vm = this;
			loadText(url, function(svg) {
				var img = new Image();
				img.onload = function() {
					var rect = vm.canvas.getBoundingClientRect();
					var ratio = Math.min(rect.width / img.width, rect.height / img.height);
					var ctx = vm.context();
					ctx.clearRect(0, 0, vm.canvas.width, vm.canvas.height);
					ctx.drawImage(img, 0, 0, ratio * img.width, ratio * img.height);
					vm.saveCanvas();
					vm.broadcastCanvas();
				};
				img.src = "data:image/svg+xml;base64," + btoa(svg);
			});
		},

		// Insert an image of the journal: move it, click, resize it, click
		insertImage: function() {
			var vm = this;
			requirejs(["sugar-web/graphics/journalchooser"], function(chooser) {
				chooser.show(function(entry) {
					if (!entry) {
						return;
					}
					new vm.datastore.DatastoreObject(entry.objectId).loadAsText(function(err, metadata, text) {
						var img = new Image();
						img.onload = function() {
							vm.placeImage(img);
						};
						img.src = text;
					});
				}, {mimetype: "image/png"}, {mimetype: "image/jpeg"});
			});
		},

		placeImage: function(img) {
			var vm = this;
			var ctx = vm.context();
			var canvasWidth = vm.canvas.width, canvasHeight = vm.canvas.height;
			var background = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
			var moving = true;
			var x = 65, y = 130;
			var width = img.width, height = img.height;
			var withImage;

			function draw() {
				ctx.putImageData(background, 0, 0);
				ctx.drawImage(img, x - 60, y - 125, width + 60, height + 70);
				withImage = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
				ctx.save();
				ctx.beginPath();
				ctx.setLineDash([1, 10]);
				ctx.strokeStyle = "#101010";
				ctx.rect(x - 65, y - 130, width + 70, height + 80);
				ctx.stroke();
				ctx.restore();
			}

			function onMove(event) {
				var point = event.touches ? event.touches[0] : event;
				if (moving) {
					x = point.clientX - width / 2;
					y = point.clientY - height / 2;
				} else {
					width = point.clientX - x;
					height = point.clientY - y;
				}
				draw();
			}

			function onUp() {
				if (moving) {
					moving = false;
					return;
				}
				ctx.putImageData(withImage, 0, 0);
				window.removeEventListener("mousemove", onMove);
				window.removeEventListener("touchmove", onMove);
				window.removeEventListener("mouseup", onUp);
				window.removeEventListener("touchend", onUp);
				vm.saveCanvas();
				vm.broadcastCanvas();
			}

			draw();
			window.addEventListener("mousemove", onMove);
			window.addEventListener("touchmove", onMove);
			window.addEventListener("mouseup", onUp);
			window.addEventListener("touchend", onUp);
		},

		// Save the drawing as an image in the journal
		saveAsImage: function() {
			var vm = this;
			var mimetype = "image/png";
			var metadata = {
				mimetype: mimetype,
				title: vm.$refs.SugarL10n.get("PaintBy", {name: vm.environment.user.name}),
				activity: "org.olpcfrance.MediaViewerActivity",
				timestamp: new Date().getTime(),
				creation_time: new Date().getTime(),
				file_size: 0
			};
			vm.datastore.create(metadata, function() {
				vm.$refs.SugarPopup.log(vm.$refs.SugarL10n.get("PaintImageSaved"));
			}, vm.canvas.toDataURL(mimetype, 1));
		}
	}
});

app.mount("#app");
