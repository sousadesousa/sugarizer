// Simple toolbar mode, applied before the page is drawn so that advanced buttons never show.
// Load it with a plain <script> in the <head> of the activity, before any other script.
// Same rules as activity.getToolbarMode in activity.js: the override of the activity wins over
// the default mode of the user, which defaults to "full".
(function() {
	try {
		var settings = JSON.parse(localStorage.getItem("sugar_settings") || "{}") || {};
		var match = /[?&]a=([^&]*)/.exec(window.location.search);
		var bundleId = match && decodeURIComponent(match[1]);
		var mode = "full";
		var overrides = settings.toolbarOverrides;
		if (overrides && typeof overrides == "object" && bundleId && Object.prototype.hasOwnProperty.call(overrides, bundleId) && (overrides[bundleId] == "simple" || overrides[bundleId] == "full")) {
			mode = overrides[bundleId];
		} else if (settings.toolbarMode == "simple" || settings.toolbarMode == "full") {
			mode = settings.toolbarMode;
		}
		if (mode == "simple") {
			document.documentElement.classList.add("toolbar-simple");
			var style = document.createElement("style");
			style.id = "toolbar-simple-style";
			style.textContent = ".toolbar-simple [data-toolbar=\"advanced\"] { display: none !important; }";
			(document.head || document.documentElement).appendChild(style);
		}
	} catch (e) {
		// never break an activity because of the settings
	}
})();
