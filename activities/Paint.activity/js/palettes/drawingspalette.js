// Drawings palette: drawings to color
define(["activity/palettes/gridpalette"], function(grid) {
	var drawings = [
		["drawings/woodpecker.svg", "drawings/tortoise.svg", "drawings/manatee.svg"],
		["drawings/dog.svg", "drawings/goldfinch.svg", "drawings/mammoth.svg"]
	];

	var drawingspalette = {};

	drawingspalette.DrawingsPalette = grid.define(function(invoker, primaryText) {
		grid.Palette.call(this, invoker, primaryText);
		var that = this;
		that.setContent([grid.grid("drawings", drawings, function(drawing) {
			var button = grid.imageButton(drawing, "55px 55px");
			button.addEventListener("click", function() {
				that.emit("drawing-selected", {drawing: drawing});
				that.popDown();
			});
			return button;
		})]);
	});

	return drawingspalette;
});
