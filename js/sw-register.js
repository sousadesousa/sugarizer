// Register the service worker (sw.js) of the web version of Sugarizer
// Not used by the apps (file:// pages). On a developer machine (localhost),
// only registered when asked with ?sw=1, to avoid serving cached files while editing.
(function() {
	if (!("serviceWorker" in navigator) || location.protocol.indexOf("http") != 0) {
		return;
	}
	var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
	if (local && !/[?&]sw=1\b/.test(location.search)) {
		return;
	}
	window.addEventListener("load", function() {
		var version = (typeof sugarizer != "undefined" && sugarizer.constant && sugarizer.constant.sugarizerVersion) ? sugarizer.constant.sugarizerVersion : "dev";
		navigator.serviceWorker.register("sw.js?v=" + encodeURIComponent(version)).then(function() {
			return navigator.serviceWorker.ready;
		}).then(function(registration) {
			// files loaded before the service worker was active are cached too
			var urls = performance.getEntriesByType("resource").map(function(entry) {
				return entry.name;
			});
			urls.push(location.href);
			registration.active.postMessage({type: "cache-urls", urls: urls});
		}).catch(function(error) {
			console.log("Service worker not registered: " + error);
		});
	});
})();
