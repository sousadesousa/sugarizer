// Steps of the tutorial, with texts from the localization
var FoodChainTutorial = {
	// game is "", "LearnGame", "BuildGame" or "PlayGame"
	steps: function(get, game) {
		var step = function(element, position, key) {
			return { element: element, position: position, title: get(key + "Title"), intro: get(key + "Content") };
		};
		var intro = function(key) {
			return { position: "bottom", title: get(key + "Title"), intro: get(key + "Content") };
		};
		if (game == "BuildGame") {
			return [
				intro("TutoExplainGame"),
				step("#buildGame_gamebox", "top", "TutoBoard"),
				step("#buildGame_home_button", "bottom", "TutoHome"),
				step("#buildGame_validate_button", "bottom", "TutoValidate"),
				step("#buildGame_pause_button", "bottom", "TutoPause"),
				step("#buildGame_play_button", "bottom", "TutoPlay")
			];
		}
		if (game == "LearnGame") {
			return [
				intro("TutoExplainLearn"),
				step("#learnGame_home_button", "bottom", "TutoHome"),
				step("#learnGame_card", "bottom", "TutoStart"),
				step("#learnGame_herbbox", "top", "TutoHerb"),
				step("#learnGame_carnbox", "top", "TutoCarn"),
				step("#learnGame_pause_button", "bottom", "TutoPause"),
				step("#learnGame_play_button", "bottom", "TutoPlay")
			];
		}
		if (game == "PlayGame") {
			return [
				intro("TutoExplainPlay"),
				step("#canvas", "top", "TutoCanvas"),
				step("#playGame_lifes", "top", "TutoLives"),
				step("#playGame_home_button", "left", "TutoHome"),
				step("#playGame_pause_button", "left", "TutoPause"),
				step("#playGame_play_button", "left", "TutoPlay")
			];
		}
		return [
			intro("TutoExplain"),
			step("#app_LearnGame_button", "right", "TutoLearn"),
			step("#app_BuildGame_button", "right", "TutoBuild"),
			step("#app_PlayGame_button", "left", "TutoPlayGame"),
			step("#en-button", "bottom", "TutoEn"),
			step("#fr-button", "bottom", "TutoFr"),
			step("#pt_BR-button", "bottom", "TutoPt"),
			step("#app_shadowButton_button", "left", "TutoInfo")
		];
	}
};
