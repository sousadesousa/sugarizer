// Palettes of Paint: a grid of buttons, a click sends an event
define(["sugar-web/graphics/palette"], function(palette) {
	var gridpalette = {};

	// Table of buttons, rows is a list of rows of items, button(item) returns a button
	gridpalette.grid = function(className, rows, button) {
		var table = document.createElement("table");
		table.className = className;
		var body = document.createElement("tbody");
		rows.forEach(function(row) {
			var tr = document.createElement("tr");
			row.forEach(function(item) {
				var td = document.createElement("td");
				td.appendChild(button(item));
				tr.appendChild(td);
			});
			body.appendChild(tr);
		});
		table.appendChild(body);
		return table;
	};

	// Button with an image
	gridpalette.imageButton = function(image, size) {
		var button = document.createElement("button");
		button.style.height = "55px";
		button.style.width = "55px";
		button.style.backgroundImage = "url(" + image + ")";
		button.style.backgroundRepeat = "no-repeat";
		button.style.backgroundPosition = "center";
		if (size) {
			button.style.backgroundSize = size;
		}
		return button;
	};

	// Show a button as selected in a list of buttons
	gridpalette.select = function(buttons, selected) {
		for (var i = 0; i < buttons.length; i++) {
			buttons[i].style.border = buttons[i] == selected ? "1px solid #f00" : "0px solid #000";
		}
	};

	// Make a palette class from its constructor, with addEventListener and emit
	gridpalette.define = function(Constructor, methods) {
		var properties = {
			addEventListener: function(type, listener, useCapture) {
				return this.getPalette().addEventListener(type, listener, useCapture);
			},
			emit: function(type, detail) {
				this.getPalette().dispatchEvent(new CustomEvent(type, {detail: detail}));
			}
		};
		Object.assign(properties, methods || {});
		var descriptors = {};
		Object.keys(properties).forEach(function(name) {
			descriptors[name] = {
				value: properties[name],
				enumerable: true,
				configurable: true,
				writable: true
			};
		});
		Constructor.prototype = Object.create(palette.Palette.prototype, descriptors);
		return Constructor;
	};

	gridpalette.Palette = palette.Palette;

	return gridpalette;
});
