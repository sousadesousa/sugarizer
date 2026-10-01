// Steps of the tutorial, with texts from the localization
var AbcdTutorial = {
	// screen is "home", "learn" or "play"
	steps: function(get, screen) {
		var step = function(element, position, key) {
			return { element: element, position: position, title: get(key + "Title"), intro: get(key + "Content") };
		};
		var steps = [];
		if (screen == "home") {
			steps.push(
				{ position: "bottom", title: get("TutoExplainTitle"), intro: get("TutoExplainContent") },
				step("#app_learn", "top", "TutoLearnButton"),
				step("#app_play", "top", "TutoPlayButton"),
				step("#app_build", "top", "TutoBuildButton"),
				step("#app_instrument", "bottom", "TutoInstrument"),
				step("#app_credit", "left", "TutoInfo")
			);
		} else if (screen == "learn") {
			steps.push(
				{ position: "bottom", title: get("TutoLearnExplainTitle"), intro: get("TutoLearnExplainContent") },
				step(".box-4-theme", "top", "TutoLearnBoxTheme"),
				step(".box-4-collection", "top", "TutoLearnBoxCollection"),
				step(".box-4-entry", "top", "TutoLearnBoxEntry"),
				step("#learn_caseButton", "bottom", "TutoFont"),
				step("#learn_languageButton", "left", "TutoLang"),
				step("#learn_home_home", "bottom", "TutoHome"),
				step("#learn_back", "bottom", "TutoBack"),
				step("#learn_prev", "bottom", "TutoPrevPage"),
				step("#learn_startSlideshow", "bottom", "TutoListen"),
				step("#learn_stopSlideshow", "bottom", "TutoPause"),
				step("#learn_next", "bottom", "TutoNextPage"),
				step("#png-button", "bottom", "TutoPng"),
				step("#sound-button", "bottom", "TutoSound")
			);
		} else if (screen == "play") {
			steps.push(
				{ position: "bottom", title: get("TutoPlayExplainTitle"), intro: get("TutoPlayExplainContent") },
				step("#play_playTypeButton", "bottom", "TutoPlay1"),
				step("#play_playTypeButton2", "bottom", "TutoPlay2"),
				step("#play_playTypeButton3", "bottom", "TutoPlay3"),
				step("#play_playTypeButton4", "top", "TutoPlay4"),
				step("#play_playTypeButton5", "top", "TutoPlay5"),
				step("#play_playTypeButton6", "top", "TutoPlay6"),
				step(".entryPlayFrom", "bottom", "TutoPlayEntryBox"),
				step("#play_check", "left", "TutoCheck"),
				step("#play_caseButton", "bottom", "TutoFont"),
				step("#play_languageButton", "left", "TutoLang"),
				step("#play_home_home", "bottom", "TutoHome"),
				step("#play_back", "bottom", "TutoBack"),
				step("#play_filter", "bottom", "TutoLearnBoxTheme")
			);
		}
		return steps;
	}
};
