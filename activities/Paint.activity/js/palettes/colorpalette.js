// Color palette: Sugar colors and sliders for red, green and blue
// Its invoker shows the current color as background color
define(["activity/palettes/gridpalette"], function(grid) {
	var colors = [
		["#FF2B34", "#00EA11", "#005FE4"],
		["#FF8F00", "#008009", "#00A0FF"],
		["#FFFA00", "#A700FF", "#5E008C"],
		["#000000", "#919496", "#ffffff"]
	];
	var channels = ["Red", "Green", "Blue"];

	var colorpalette = {};

	colorpalette.ColorPalette = grid.define(function(invoker, primaryText) {
		grid.Palette.call(this, invoker, primaryText);
		var that = this;
		that.invoker = invoker;

		var content = document.createElement("div");
		content.style.width = "370px";

		var colorsElem = document.createElement("div");
		colorsElem.style.cssFloat = "left";
		colorsElem.style.width = "190px";
		colorsElem.appendChild(grid.grid("colors", colors, function(color) {
			var button = document.createElement("button");
			button.style.backgroundColor = color;
			button.addEventListener("click", function() {
				that.emit("color-change", {color: button.style.backgroundColor});
				that.popDown();
			});
			return button;
		}));
		content.appendChild(colorsElem);

		var slidersElem = document.createElement("div");
		slidersElem.style.cssFloat = "left";
		slidersElem.style.width = "150px";
		slidersElem.style.paddingTop = "10px";
		that.sliders = channels.map(function(name, index) {
			var label = document.createElement("div");
			label.textContent = name;
			label.style.marginTop = index ? "10px" : "0";
			var slider = document.createElement("input");
			slider.type = "range";
			slider.min = 0;
			slider.max = 255;
			slider.addEventListener("change", function() {
				that.emit("color-change", {
					color: "rgb(" + that.sliders.map(function(s) { return s.value; }).join(",") + ")"
				});
			});
			slidersElem.appendChild(label);
			slidersElem.appendChild(slider);
			return slider;
		});
		content.appendChild(slidersElem);

		that.setContent([content]);
		content.parentNode.style.height = "225px";
		content.parentNode.style.overflowY = "auto";
		content.parentNode.style.overflowX = "hidden";
	}, {
		// Sliders show the current color when the palette opens
		popUp: function() {
			var color = getComputedStyle(this.invoker).backgroundColor.match(/\d+/g);
			if (color) {
				for (var i = 0; i < 3; i++) {
					this.sliders[i].value = color[i];
				}
			}
			grid.Palette.prototype.popUp.call(this);
		}
	});

	return colorpalette;
});
