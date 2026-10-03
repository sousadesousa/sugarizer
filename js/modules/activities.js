// Interface to activities
define(["sugar-web/datastore"], function (datastore) {
	var activities = {};

	var list = [];
	var serverActivityIds = null;

	var genericActivity = {directory: "icons", icon: "application-x-generic.svg"};

	var constant = {
		staticInitActivitiesURL: "activities.json",
	};

	var updateServerActivityIds = function(newlist) {
		if (newlist === undefined || newlist == null) {
			serverActivityIds = null;
			return;
		}
		serverActivityIds = {};
		for (var i = 0 ; i < newlist.length ; i++) {
			serverActivityIds[newlist[i].id] = true;
		}
		updateToolbarModes(newlist);
	};

	// The server tells a student the toolbar mode ("simple" or "full") of each activity, set by
	// the classrooms of the student. Keep it in the user settings, where activities read it.
	// Teachers and administrators choose their own mode in the settings.
	var updateToolbarModes = function(serverList) {
		var user = sugarizer.modules.settings.getUser();
		if (!user || user.role != "student") {
			return;
		}
		var overrides = {};
		for (var i = 0 ; i < serverList.length ; i++) {
			var mode = serverList[i].toolbarMode;
			if (mode == "simple" || mode == "full") {
				overrides[serverList[i].id] = mode;
			}
		}
		sugarizer.modules.settings.setUser({toolbarMode: "full", toolbarOverrides: overrides});
	};

	// Update activity list
	var updateList = function(newlist, removeMissing) {
		// Nothing to do
		if (newlist === undefined || newlist == null) {
			return false;
		}

		if (removeMissing === undefined) {
			removeMissing = true;
		}

		// Empty list, just set it
		if (list.length == 0) {
			list = newlist;
			return true;
		}

		// Some activities updated, update it
		var updated = false;
		var seen = 0;
		for (var i = 0 ; i < newlist.length ; i++) {
			var found = false;
			for (var j = 0 ; !found && j < list.length ; j++) {
				if (newlist[i].id == list[j].id) {
					found = true;
					seen++;
					if (list[j].version != newlist[i].version) {
						list[j].name = newlist[i].name;
						list[j].version = newlist[i].version;
						list[j].directory = newlist[i].directory;
						list[j].icon = newlist[i].icon;
						updated = true;
					}
				}
			}
			if (!found) {
				list.push(newlist[i]);
				updated = true;
			}
		}

		// Some activities disappeared, remove it
		if (removeMissing && seen != list.length) {
			updated = true;
			var newactivities = [];
			for (var i = 0 ; i < list.length ; i++) {
				var found = false;
				for (var j = 0 ; !found && j < newlist.length ; j++) {
					if (list[i].id == newlist[j].id || list[i].type == "native") {
						found = true;
						newactivities.push(list[i]);
					}
				}
			}
			list = newactivities;
		}
		return updated;
	};

	// A student connected to a server only gets the activities assigned to the classrooms
	// of the student: the server sends only these ones, so drop the others (e.g. from the
	// static activities list). Teachers and administrators keep all activities.
	var restrictForStudent = function() {
		if (serverActivityIds == null) {
			return;
		}
		var settings = sugarizer.modules.settings.getUser();
		if (!settings || settings.role != "student") {
			return;
		}
		list = list.filter(function(activity) {
			return Object.prototype.hasOwnProperty.call(serverActivityIds, activity.id);
		});
	};

	// If we are in the SugarizerOS environment, load also the android apps into activities
	var updateSugarizerOS = function(callback) {
		if (window.sugarizerOS){
			sugarizerOS.isAppCacheReady(function(response) {
				// TODO: use a better notification system
				if (!response.ready) {
					var loading = humane.create({timeout: 5000, baseCls: "humane-libnotify"});
					loading.log(sugarizer.modules.i18next.t("Loading"));
				}
			});
			sugarizerOS.initActivitiesPreferences(function(){
				callback();
			});
		} else {
			callback();
		}
	};

	// Load activities, return a Promise object
	activities.load = function() {
		// Get activities list from server
		if (sugarizer.getClientType() == sugarizer.constant.webAppType || sugarizer.modules.user.isConnected()) {
			return new Promise(function(resolve, reject) {
				axios.get(constant.staticInitActivitiesURL).then(function(localResponse) {
					updateServerActivityIds(null);
					updateList(localResponse.data, true);
					sugarizer.modules.server.getActivities(sugarizer.modules.user.getServerURL()).then(function(serverResponse) {
						updateServerActivityIds(serverResponse);
						updateList(serverResponse, false);
						restrictForStudent();
						updateSugarizerOS(function() {
							resolve(list);
						});
					}, function() {
						updateServerActivityIds(null);
						updateSugarizerOS(function() {
							resolve(list);
						});
					});
				}).catch(function(localError) {
					sugarizer.modules.server.getActivities(sugarizer.modules.user.getServerURL()).then(function(serverResponse) {
						updateServerActivityIds(serverResponse);
						updateList(serverResponse, true);
						updateSugarizerOS(function() {
							resolve(list);
						});
					}, function(error) {
						reject(error || localError);
					});
				});
			});
		}

		// Get activities list from local file
		return new Promise(function(resolve, reject) {
			axios.get(constant.staticInitActivitiesURL).then(function(response) {
				updateServerActivityIds(null);
				updateList(response.data);
				updateSugarizerOS(function() {
					resolve(list);
				});
			}).catch(function(error) {
				reject(error);
			});
		});
	};

	// Get activities
	activities.get = function() {
		return list;
	};
	activities.getByName = function(name) {
		if (name === undefined || name == null || name.length == 0) {
			return list;
		}
		var activities = list;
		var matching = [];
		for (var i = 0 ; i < activities.length ; i++) {
			if (activities[i].name.toLowerCase().indexOf(name) != -1) {
				matching.push(activities[i]);
			}
		}
		return matching;
	};
	activities.getById = function(id) {
		for(var i = 0 ; i < list.length ; i++) {
			if (list[i].id == id) {
				return list[i];
			}
		}
		return genericActivity;
	};
	activities.getFavorites = function() {
		var favorites = [];
		for(var i = 0 ; i < list.length ; i++) {
			if (list[i].favorite) {
				favorites.push(list[i]);
			}
		}
		return favorites;
	};
	activities.getFavoritesName = function() {
		var favorites = this.getFavorites();
		var names = [];
		for(var i = 0 ; i < favorites.length ; i++) {
			names.push(favorites[i].id);
		}
		return names;
	};

	// Set activities
	activities.set = function(newlist) {
		list = [];
		for(var i = 0 ; i < newlist.length ; i++) {
			if ((newlist[i].isNative || (newlist[i].type && newlist[i].type == "native")) && !window.sugarizerOS) {
				continue;
			}
			list.push(newlist[i]);
		}
	};


	// Update favorites from user preferences
	activities.updateFavorites = function(favorites) {
		if (favorites === undefined || favorites == null) {
			return;
		}
		for (var i = 0 ; i < list.length ; i++) {
			if (favorites.indexOf(list[i].id) != -1) {
				list[i].favorite = true;
			} else if (!serverActivityIds || serverActivityIds[list[i].id]) {
				list[i].favorite = false;
			}
		}
	}

	// Test if activity is generic
	activities.isGeneric = function(activity) {
		return activity.directory === "icons" && activity.icon === "application-x-generic.svg";
	};
	activities.genericActivity = function() {
		return genericActivity;
	};

	// Run activity
	activities.runActivity = function(activity, objectId, name, sharedId, help, view) {
		if (activity.type != null && activity.type == "native") {
			if (sugarizerOS) {
				sugarizerOS.runActivity(activity.id);
				sugarizerOS.addApplicationToJournal(sugarizerOS.log, activity, datastore);
				return;
			}
			console.log("No sugarizerOS instance found");
		}
		if (activity.activityId == null) {
			activity.activityId = datastore.createUUID();
		}
		var location = activity.directory+"/index.html?aid="+activity.activityId+"&a="+activity.id;
		if (objectId != null) {
			location = location + "&o=" + objectId + "&n="+name;
		} else {
			location = location + "&n=" +activity.name;
		}
		if (sharedId) {
			location = location + "&s=" + sharedId;
		}
		if (help) {
			location = location + "&h=1";
		}
		sugarizer.modules.stats.trace(view, (objectId ? 're' : '') + 'launch_activity', activity.id, objectId);
		window.location = location;
	};
	
	return activities;
});
