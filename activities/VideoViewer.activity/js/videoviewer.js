// Video Viewer shared code: libraries, video database, filters and the context saved in the journal
var VV = {};

VV.constant = {
	// Number of videos by page
	pageCount: 4,
	librariesUrl: "https://sugarizer.org/content/videos.json",
	videoType: "mp4"
};

// Reactive state shared by the components
VV.state = Vue.reactive({
	// Context saved in the journal
	context: {
		filter: { category: "", text: "", favorite: false },
		libraries: null,
		library: null,
		favorites: {},
		readtimes: {},
		currentindex: 0
	},
	// Videos of the library selected and their categories
	database: [],
	categories: [],
	// Language of the user
	language: "en"
});

VV.context = function() {
	return VV.state.context;
};

// Save the context in the journal
VV.saveContext = function() {
	if (!VV.activity) {
		return;
	}
	var datastoreObject = VV.activity.getDatastoreObject();
	datastoreObject.setDataAsText(JSON.stringify(VV.context()));
	datastoreObject.save(function() {});
};

// Videos matching the filter: favorites, category and text
VV.getCollection = function() {
	var context = VV.context();
	var text = context.filter.text.toLowerCase();
	return VV.state.database.filter(function(video) {
		if (context.filter.favorite && !VV.getFavorite(video.id)) {
			return false;
		}
		if (context.filter.category.length > 0 && video.category != context.filter.category) {
			return false;
		}
		return text.length == 0 || video.title.toLowerCase().indexOf(text) != -1;
	});
};

VV.setFilter = function(newfilter) {
	var filter = VV.context().filter;
	if (newfilter.favorite !== undefined) filter.favorite = newfilter.favorite;
	if (newfilter.category !== undefined) filter.category = newfilter.category;
	if (newfilter.text !== undefined) filter.text = newfilter.text;
};

VV.setFavorite = function(id, value) {
	if (value) {
		VV.context().favorites[id] = value;
	} else {
		delete VV.context().favorites[id];
	}
};

VV.getFavorite = function(id) {
	return VV.context().favorites[id];
};

VV.setReadTime = function(id, time) {
	if (time) {
		VV.context().readtimes[id] = time;
	} else {
		delete VV.context().readtimes[id];
	}
};

VV.getReadTime = function(id) {
	return VV.context().readtimes[id];
};

VV.addLibrary = function(library) {
	VV.context().libraries.push(library);
};

// A library can't be removed if it is the one used or the only one
VV.removeLibrary = function(library) {
	var context = VV.context();
	if (context.library == library || context.libraries.length == 1) {
		return;
	}
	context.libraries = context.libraries.filter(function(other) {
		return other != library;
	});
};

// Load the list of libraries, callback(error)
VV.loadLibraries = function(callback) {
	requirejs(["lib/axios.min.js"], function(axios) {
		axios.get(VV.constant.librariesUrl + "?lang=" + VV.state.language).then(function(response) {
			VV.context().libraries = response.data;
			callback(null);
		}).catch(function(error) {
			console.log("Error loading library on '" + VV.constant.librariesUrl + "'");
			callback(error);
		});
	});
};

// Load the videos of the library selected, callback(error)
VV.loadDatabase = function(callback) {
	var library = VV.context().library;
	if (library == null) {
		return;
	}
	var url = library.database.replace(new RegExp("%language%", "g"), VV.state.language);
	if (document.location.protocol == "https:") {
		url = url.replace("http://", "https://");
	}
	requirejs(["lib/axios.min.js"], function(axios) {
		axios.get(url).then(function(response) {
			var data = response.data;
			var categories = [];
			data.forEach(function(video) {
				if (video.category !== undefined && !categories.some(function(category) {
					return category.id == video.category;
				})) {
					categories.push({ id: video.category, title: video.category });
				}
			});
			VV.state.database = data;
			VV.state.categories = categories;
			callback(null);
		}).catch(function(error) {
			console.log("Error loading database on '" + url + "'");
			callback(error);
		});
	});
};

// Replace the values of a video in an url template
VV.replaceValues = function(template, video) {
	return template
		.replace(/%id%/g, video.id)
		.replace(/%image%/g, video.image || "")
		.replace(/%category%/g, video.category)
		.replace(/%title%/g, video.title);
};

VV.videoURL = function(video) {
	return VV.replaceValues(VV.context().library.videos, video) + "." + VV.constant.videoType;
};

VV.imageURL = function(video) {
	return VV.replaceValues(VV.context().library.images, video);
};

// Bytes to base 64
VV.toBase64 = function(bytes) {
	var binary = "";
	for (var i = 0 ; i < bytes.length ; i += 0x8000) {
		binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
};
