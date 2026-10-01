// Service worker for the web version of Sugarizer: keeps the files already
// used (home view, activities) in a cache, so they load fast on slow
// networks and still load when the network is down.
// - pages: network first, cached copy when offline
// - other files: cached copy first, refreshed in the background
// - server API, dashboard and other sites: never cached
// Registered by js/sw-register.js, with the Sugarizer version in the URL:
// a new version installs a new cache and removes the old ones.

var version = new URL(self.location.href).searchParams.get("v") || "dev";
var cacheName = "sugarizer-" + version;
var cachePrefix = "sugarizer-";

// Paths served by Sugarizer Server that must always come from the network
var noCache = /^\/(api|auth|dashboard|public|docs)(\/|$)/;

self.addEventListener("install", function(event) {
	event.waitUntil(caches.open(cacheName).then(function(cache) {
		return cache.addAll(["index.html"]);
	}).then(function() {
		return self.skipWaiting();
	}));
});

self.addEventListener("activate", function(event) {
	event.waitUntil(caches.keys().then(function(names) {
		return Promise.all(names.filter(function(name) {
			return name.indexOf(cachePrefix) == 0 && name != cacheName;
		}).map(function(name) {
			return caches.delete(name);
		}));
	}).then(function() {
		return self.clients.claim();
	}));
});

function cacheable(request) {
	if (request.method != "GET") {
		return false;
	}
	var url = new URL(request.url);
	return url.origin == self.location.origin && !noCache.test(url.pathname);
}

// Store a response if it is complete and successful
function store(request, response) {
	if (response && response.status == 200 && response.type == "basic") {
		var copy = response.clone();
		caches.open(cacheName).then(function(cache) {
			cache.put(request, copy);
		});
	}
	return response;
}

self.addEventListener("fetch", function(event) {
	var request = event.request;
	if (!cacheable(request)) {
		return;
	}
	if (request.mode == "navigate") {
		// Pages: latest version when online, cached copy otherwise
		event.respondWith(fetch(request).then(function(response) {
			return store(request, response);
		}).catch(function() {
			return caches.match(request, {ignoreSearch: true}).then(function(cached) {
				return cached || caches.match("index.html");
			});
		}));
		return;
	}
	// Other files: cached copy at once, refreshed for next time
	event.respondWith(caches.match(request).then(function(cached) {
		var network = fetch(request).then(function(response) {
			return store(request, response);
		});
		if (cached) {
			network.catch(function() {});
			return cached;
		}
		return network;
	}));
});

// The page sends the files it loaded before the service worker was active
self.addEventListener("message", function(event) {
	if (!event.data || event.data.type != "cache-urls" || !Array.isArray(event.data.urls)) {
		return;
	}
	var urls = event.data.urls.filter(function(url) {
		return cacheable(new Request(url));
	});
	event.waitUntil(caches.open(cacheName).then(function(cache) {
		return Promise.all(urls.map(function(url) {
			return cache.match(url).then(function(cached) {
				return cached || cache.add(url).catch(function() {});
			});
		}));
	}));
});
