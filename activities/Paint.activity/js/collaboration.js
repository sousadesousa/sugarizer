// Shared drawing: the messages are the same as in previous versions of Paint,
// so users of different versions can draw together
var PaintCollaboration = {
	data: function() {
		return {
			isShared: false,
			isHost: true
		};
	},

	methods: {
		// The user shared the activity from the network palette
		onShared: function(event, paletteObject) {
			paletteObject.popDown();
			this.shareActivity();
		},

		shareActivity: function() {
			var vm = this;
			vm.presence = vm.activity.getPresenceObject(function(error, presence) {
				if (error) {
					console.log(error);
					return;
				}
				vm.isShared = true;

				// Not joining a shared activity: create it
				if (!vm.environment.sharedId) {
					presence.createSharedActivity("org.olpcfrance.PaintActivity", function() {});
				} else {
					var networkPalette = vm.$refs.networkItem && vm.$refs.networkItem.paletteObject;
					if (networkPalette) {
						networkPalette.setShared(true);
					}
				}
				presence.onConnectionClosed(function() {
					console.log("Connection closed");
				});
				presence.onSharedActivityUserChanged(vm.onUserChanged);
				presence.onDataReceived(vm.onDataReceived);

				// Joining: ask the first user for the current drawing
				if (!vm.isHost) {
					var waitForUsers = setInterval(function() {
						if (!presence.sharedInfo || !presence.sharedInfo.users) {
							return;
						}
						clearInterval(waitForUsers);
						vm.sendMessage({
							action: "entranceToDataURLRequest " + presence.sharedInfo.users[0]
						});
					}, 500);
				}
			});
		},

		sendMessage: function(content) {
			var sharedId = this.environment.sharedId || this.presence.getSharedInfo().id;
			this.presence.sendMessage(sharedId, {
				user: this.presence.getUserInfo(),
				content: content
			});
		},

		// Current drawing, as sent to other users and saved in the journal
		canvasData: function() {
			return {
				width: this.canvas.width / window.devicePixelRatio,
				height: this.canvas.height / window.devicePixelRatio,
				src: this.compress(this.canvas.toDataURL())
			};
		},

		// Send the whole drawing to other users
		broadcastCanvas: function() {
			if (!this.isShared) {
				return;
			}
			try {
				this.sendMessage({
					action: "toDataURL",
					data: this.canvasData()
				});
			} catch (e) {
				console.log(e);
			}
		},

		compress: function(data) {
			return this.LZString.compressToUTF16(data);
		},

		decompress: function(data) {
			return this.LZString.decompressFromUTF16(data);
		},

		onUserChanged: function(msg) {
			var name = document.createElement("span");
			name.textContent = msg.user.name;
			var key = msg.move === 1 ? "PlayerJoin" : "PlayerLeave";
			var icon = "<img style='height:30px;' src='" + xoLogo(msg.user.colorvalue) + "'>";
			this.$refs.SugarPopup.log(icon + this.$refs.SugarL10n.get(key, {user: name.innerHTML}));
		},

		onDataReceived: function(msg) {
			// Ignore messages coming from ourselves
			if (this.presence.getUserInfo().networkId === msg.user.networkId) {
				return;
			}
			var data = msg.content.data;
			switch (msg.content.action) {
			case "path":
				this.drawPath(data);
				break;
			case "text":
				this.drawText(data);
				break;
			case "drawImage":
				this.drawImageFrom(data.src, data);
				break;
			case "drawStamp":
				this.drawStamp(data);
				break;
			case "entranceToDataURLRequest " + this.presence.getUserInfo().networkId:
				this.sendMessage({
					action: "entranceToDataURL",
					data: this.canvasData()
				});
				break;
			case "entranceToDataURL":
			case "toDataURL":
				this.clearCanvas();
				this.drawImageFrom(this.decompress(data.src), {left: 0, top: 0, width: data.width, height: data.height});
				break;
			case "clearCanvas":
				this.clearCanvas();
				break;
			case "saveCanvas":
				if (this.isHost) {
					this.saveCanvas();
				}
				break;
			}
		},

		drawPath: function(data) {
			var ctx = this.context();
			ctx.beginPath();
			ctx.strokeStyle = data.strokeStyle;
			ctx.lineCap = data.lineCap;
			ctx.lineWidth = data.lineWidth;
			ctx.moveTo(data.from.x, data.from.y);
			ctx.lineTo(data.to.x, data.to.y);
			ctx.stroke();
		},

		drawText: function(data) {
			var ctx = this.context();
			ctx.font = data.font;
			ctx.fillStyle = data.fillStyle;
			ctx.textAlign = data.textAlign;
			ctx.fillText(data.text, data.left, data.top);
		},

		drawImageFrom: function(src, box) {
			var vm = this;
			var img = new Image();
			img.onload = function() {
				vm.context().drawImage(img, box.left, box.top, box.width, box.height);
			};
			img.src = src;
		},

		drawStamp: function(data) {
			var vm = this;
			loadText(data.stampBase.replace("{platform}", stampPlatform()), function(svg) {
				var stamp = changeColors(svg, data.color.fill, data.color.stroke);
				vm.drawImageFrom("data:image/svg+xml;base64," + btoa(stamp), data);
			});
		}
	}
};

// XO icon with the colors of a user
function xoLogo(color) {
	var svg = "<?xml version=\"1.0\" ?><!DOCTYPE svg  PUBLIC '-//W3C//DTD SVG 1.1//EN'  'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd' [<!ENTITY stroke_color \"#010101\"><!ENTITY fill_color \"#FFFFFF\">]><svg enable-background=\"new 0 0 55 55\" height=\"55px\" version=\"1.1\" viewBox=\"0 0 55 55\" width=\"55px\" x=\"0px\" xml:space=\"preserve\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" y=\"0px\"><g display=\"block\" id=\"stock-xo_1_\"><path d=\"M33.233,35.1l10.102,10.1c0.752,0.75,1.217,1.783,1.217,2.932   c0,2.287-1.855,4.143-4.146,4.143c-1.145,0-2.178-0.463-2.932-1.211L27.372,40.961l-10.1,10.1c-0.75,0.75-1.787,1.211-2.934,1.211   c-2.284,0-4.143-1.854-4.143-4.141c0-1.146,0.465-2.184,1.212-2.934l10.104-10.102L11.409,24.995   c-0.747-0.748-1.212-1.785-1.212-2.93c0-2.289,1.854-4.146,4.146-4.146c1.143,0,2.18,0.465,2.93,1.214l10.099,10.102l10.102-10.103   c0.754-0.749,1.787-1.214,2.934-1.214c2.289,0,4.146,1.856,4.146,4.145c0,1.146-0.467,2.18-1.217,2.932L33.233,35.1z\" fill=\"&fill_color;\" stroke=\"&stroke_color;\" stroke-width=\"3.5\"/><circle cx=\"27.371\" cy=\"10.849\" fill=\"&fill_color;\" r=\"8.122\" stroke=\"&stroke_color;\" stroke-width=\"3.5\"/></g></svg>";
	return "data:image/svg+xml;base64," + btoa(changeColors(svg, color.fill, color.stroke));
}
