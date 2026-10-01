// Steps of the tutorial, with texts from the localization
var TamTamTutorial = {
	// mode is "instruments", "piano" or "simon"
	steps: function(get, mode, current) {
		var step = function(element, position, key, contentKey) {
			return { element: element, position: position, title: get(key + "Title"), intro: get(contentKey || (key + "Content")) };
		};
		var info = function(element, key) {
			return { element: element, position: "bottom", title: get(key + "Title"), intro: get(key + "Content") };
		};
		if (mode == "piano") {
			return [
				step("#app_" + current, "bottom", "TutoCurrentMode"),
				step("#piano-container", "top", "TutoPiano"),
				info("#instruments-button", "TutoInstrumentInfo"),
				info("#simon-button", "TutoSimonInfo")
			];
		}
		if (mode == "simon") {
			return [
				step("#app_" + current, "bottom", "TutoCurrentMode", "TutoSimonModeContent"),
				step("#Simon-board", "top", "TutoSimon"),
				step("#Red", "left", "TutoRed"),
				step("#Green", "right", "TutoGreen"),
				step("#Yellow", "left", "TutoYellow"),
				step("#Blue", "right", "TutoBlue"),
				{ element: "#SimonStart", position: "bottom", title: get("TutoSimonCentreInfo"), intro: get("TutoSimonCentreContent") },
				{ element: "#SimonLevel", position: "bottom", title: get("TutoSimonLevelInfo"), intro: get("TutoSimonLevelContent") },
				{ element: "#SimonScroe", position: "bottom", title: get("TutoSimonScoreInfo"), intro: get("TutoSimonScoreContent") },
				info("#instruments-button", "TutoInstrumentInfo"),
				info("#piano-button", "TutoPianoInfo")
			];
		}
		return [
			{ position: "bottom", title: get("TutoExplainTitle"), intro: get("TutoExplainContent") },
			step("#app_items", "top", "TutoSounds"),
			step("#app_collections", "bottom", "TutoFilter"),
			info("#piano-button", "TutoPianoInfo"),
			info("#simon-button", "TutoSimonInfo")
		];
	}
};
