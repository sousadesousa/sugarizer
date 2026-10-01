// Filters palette: effects on the whole drawing
define(["activity/palettes/gridpalette"], function(grid) {
	var filters = [[
		{icon: "icons/effect-grayscale.svg", title: "Grayscale", filter: "grayscale"},
		{icon: "icons/invert-colors.svg", title: "Color inversion", filter: "invert"}
	]];

	var filterspalette = {};

	filterspalette.FiltersPalette = grid.define(function(invoker, primaryText) {
		grid.Palette.call(this, invoker, primaryText);
		var that = this;
		that.buttons = {};
		that.setContent([grid.grid("filters", filters, function(item) {
			var button = grid.imageButton(item.icon);
			button.title = item.title;
			button.addEventListener("click", function() {
				that.emit("filter-selected", {filter: item.filter});
				that.popDown();
			});
			that.buttons[item.filter] = button;
			return button;
		})]);
	}, {
		// Translate titles, get(key) returns a localized string
		localize: function(get) {
			for (var filter in this.buttons) {
				this.buttons[filter].title = get(filter + ".title") || this.buttons[filter].title;
			}
		}
	});

	return filterspalette;
});
