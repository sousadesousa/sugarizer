// Rules of the Last One Loses game: a number of items, each player takes 1 to 3 of them,
// the player who takes the last one loses
function LOLGame(size) {
	// Set initial
	var length = Math.max(size, 0);
	var player = 0;

	// Accessor
	this.getLength = function() {
		return length;
	};
	this.getPlayer = function() {
		return player;
	};

	// Change player, only at start
	this.reverse = function() {
		player = (player + 1) % 2;
		return true;
	};

	// Play: take some items, returns the number of items left. The other player plays then, except at the end.
	this.play = function(number) {
		if (number === undefined || number == null || number < 1 || number > 3 || number > length) {
			return length;
		}
		length = length - number;
		if (length > 0) {
			player = (player + 1) % 2;
		}
		return length;
	};

	// Test end of game
	this.endOfGame = function() {
		return length == 0;
	};

	// Think to the better next shot
	this.think = function(level) {
		// Level 1: try to leave at least one at end of game
		if (level >= 1) {
			if (length >= 2 && length <= 4) {
				return length - 1;
			}
		}

		// Level 2: try to leave five
		if (level >= 2) {
			if (length >= 6 && length <= 8) {
				return length - 5;
			}
		}

		// Level 3: always try to left the nearest multiple of 4+1
		if (level >= 3) {
			var attemptsup = length - (Math.floor(length / 4) * 4 + 1);
			if (attemptsup >= 1 && attemptsup <= 3) {
				return attemptsup;
			}
			var attemptinf = length - ((Math.floor(length / 4) - 1) * 4 + 1);
			if (attemptinf >= 1 && attemptinf <= 3) {
				return attemptinf;
			}
		}

		// Simple case: randomly choose a number
		return Math.floor(Math.random() * Math.min(3, length - 1)) + 1;
	};
}

// Colors of the icon of a user, as an image
var LOL = {
	xoLogo: '<?xml version="1.0" ?><!DOCTYPE svg  PUBLIC \'-//W3C//DTD SVG 1.1//EN\'  \'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd\' [<!ENTITY stroke_color "#010101"><!ENTITY fill_color "#FFFFFF">]><svg enable-background="new 0 0 55 55" height="55px" version="1.1" viewBox="0 0 55 55" width="55px" x="0px" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" y="0px"><g display="block" id="stock-xo_1_"><path d="M33.233,35.1l10.102,10.1c0.752,0.75,1.217,1.783,1.217,2.932   c0,2.287-1.855,4.143-4.146,4.143c-1.145,0-2.178-0.463-2.932-1.211L27.372,40.961l-10.1,10.1c-0.75,0.75-1.787,1.211-2.934,1.211   c-2.284,0-4.143-1.854-4.143-4.141c0-1.146,0.465-2.184,1.212-2.934l10.104-10.102L11.409,24.995   c-0.747-0.748-1.212-1.785-1.212-2.93c0-2.289,1.854-4.146,4.146-4.146c1.143,0,2.18,0.465,2.93,1.214l10.099,10.102l10.102-10.103   c0.754-0.749,1.787-1.214,2.934-1.214c2.289,0,4.146,1.856,4.146,4.145c0,1.146-0.467,2.18-1.217,2.932L33.233,35.1z" fill="&fill_color;" stroke="&stroke_color;" stroke-width="3.5"/><circle cx="27.371" cy="10.849" fill="&fill_color;" r="8.122" stroke="&stroke_color;" stroke-width="3.5"/></g></svg>'
};

LOL.xoLogoWithColor = function(color) {
	var logo = LOL.xoLogo.replace("#010101", color.stroke).replace("#FFFFFF", color.fill);
	return "data:image/svg+xml;base64," + btoa(logo);
};

// Reactive state shared by the components
LOL.state = Vue.reactive({
	// Colors of the user
	userColor: { stroke: "#005FE4", fill: "#FF2B34" },
	fullscreen: false
});
