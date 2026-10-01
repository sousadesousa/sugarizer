// Abecedarium sound engine: plays one sound at a time and tells when it ends
// (HTML5 audio, or the Media plugin in Android and iOS apps)
Abcd.Audio = function() {
	var userAgent = navigator.userAgent;
	this.isAndroid = /android/i.test(userAgent);
	this.isIOS = /iPad|iPhone|iPod/.test(userAgent);
	this.isCordova = (this.isAndroid || this.isIOS) && document.location.protocol.substr(0, 4) != "http";
	this.format = ".mp3";
	this.current = null;
	this.started = false;
	this.listeners = { ended: [], timeupdate: [] };
	this.media = null;

	var that = this;
	this.node = new Audio();
	this.node.preload = "auto";
	this.node.addEventListener("ended", function() {
		that.emit("ended", that.current);
	});
	this.node.addEventListener("timeupdate", function() {
		that.emit("timeupdate", that.node.currentTime * 1000);
	});
	this.handleVolumeButtons();
};

Abcd.Audio.prototype = {
	on: function(event, listener) {
		this.listeners[event].push(listener);
	},

	off: function(event, listener) {
		var index = this.listeners[event].indexOf(listener);
		if (index != -1) {
			this.listeners[event].splice(index, 1);
		}
	},

	emit: function(event, value) {
		this.listeners[event].slice().forEach(function(listener) {
			listener(value);
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

	// Play a sound, given without extension
	play: function(sound) {
		this.current = sound;
		var src = sound + this.format;
		if (this.isCordova) {
			this.playWithMedia(src);
			return;
		}
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
	playWithMedia: function(src) {
		var database = Abcd.getDatabase();
		var path = (database.length == 0 || src.indexOf("database") == -1) ? location.pathname.substring(0, 1 + location.pathname.lastIndexOf("/")) + src : src;
		var that = this;
		this.releaseMedia();
		var playMedia = function(url) {
			that.media = new Media(url, function() {}, function() {}, function(status) {
				if (status == 4 && this.src != "") {
					that.emit("ended", that.current);
				}
			});
			that.media.play();
		};

		// HACK: On iOS, remote MP3 should be downloaded locally first
		if (this.isIOS && path.substr(0, 4) == "http") {
			var fileTransfer = new FileTransfer();
			var fileURL = "cdvfile://localhost/temporary/sugarizer/abecedarium.mp3";
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
