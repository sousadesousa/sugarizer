// Stamp palette: shapes to put on the drawing
define(["activity/palettes/gridpalette"], function(grid) {
	var stamps = [
		[{base: "stamps/heart-{platform}.svg", proportionnal: true}, {base: "stamps/star-{platform}.svg", proportionnal: true}, {base: "stamps/square-{platform}.svg", proportionnal: false}],
		[{base: "stamps/circle-{platform}.svg", proportionnal: true}, {base: "stamps/triangle-{platform}.svg", proportionnal: true}, {base: "stamps/flower-{platform}.svg", proportionnal: true}]
	];

	var stamppalette = {};

	stamppalette.StampPalette = grid.define(function(invoker, primaryText) {
		grid.Palette.call(this, invoker, primaryText);
		var that = this;
		var platform = typeof InstallTrigger !== "undefined" ? "gecko" : "webkit";
		var buttons = [];
		var table = grid.grid("stamps", stamps, function(stamp) {
			var url = stamp.base.replace("{platform}", platform);
			var button = grid.imageButton(url, "40px");
			button.addEventListener("click", function() {
				grid.select(buttons, button);
				that.emit("stamp-change", {
					stampBase: stamp.base,
					stamp: url,
					proportionnal: stamp.proportionnal
				});
				that.popDown();
			});
			buttons.push(button);
			return button;
		});
		grid.select(buttons, buttons[0]);
		that.setContent([table]);
	});

	return stamppalette;
});
