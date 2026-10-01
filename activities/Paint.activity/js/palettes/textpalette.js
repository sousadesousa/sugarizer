// Text palette: text to write and its font
define(["activity/palettes/gridpalette"], function(grid) {
	var fonts = [[
		{icon: "icons/text/arial.svg", lineHeight: "0.7", fontFamily: "Arial"},
		{icon: "icons/text/comic-sans.svg", lineHeight: "0.8", fontFamily: "Comic Sans MS"},
		{icon: "icons/text/verdana.svg", lineHeight: "0.8", fontFamily: "Verdana"}
	]];

	var textpalette = {};

	textpalette.TextPalette = grid.define(function(invoker, primaryText) {
		grid.Palette.call(this, invoker, primaryText);
		var that = this;
		var font = fonts[0][0];
		var content = document.createElement("div");

		var input = document.createElement("input");
		input.id = "text-input";
		input.type = "text";
		input.value = "Paint";
		input.style.margin = "10px";
		content.appendChild(input);

		function change() {
			that.emit("text-change", {
				text: input.value,
				fontFamily: font.fontFamily,
				lineHeight: font.lineHeight
			});
		}
		input.addEventListener("input", change);

		var buttons = [];
		var table = grid.grid("fonts", fonts, function(item) {
			var button = grid.imageButton(item.icon, "40px");
			button.style.backgroundColor = "#fff";
			button.addEventListener("click", function() {
				grid.select(buttons, button);
				font = item;
				change();
				that.popDown();
			});
			buttons.push(button);
			return button;
		});
		table.style.margin = "0 auto 10px auto";
		grid.select(buttons, buttons[0]);
		content.appendChild(table);
		that.setContent([content]);
	});

	return textpalette;
});
