// Steps of the tutorial, with texts from the localization
var VideoViewerTutorial = {
	steps: function(get) {
		var step = function(element, key, position) {
			return { element: element, position: position || "bottom", title: get(key + "Title"), intro: get(key + "Content") };
		};
		return [
			{ title: get("TutoExplainTitle"), intro: get("TutoExplainContent") },
			step("#filter-button", "TutoFilter"),
			step("#favorite-button", "TutoFavorite"),
			step("#library-button", "TutoLibrary"),
			step("#exportvideo-button", "TutoExportvideo"),
			step(".item .itemPlay", "TutoVideo", "right"),
			step("#search", "TutoSearch")
		];
	}
};
