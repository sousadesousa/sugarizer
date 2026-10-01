// Steps of the tutorial, with texts from the localization
var LOLTutorial = {
	steps: function(get) {
		var step = function(element, key) {
			return { element: element, position: "bottom", title: get(key + "Title"), intro: get(key + "Content") };
		};
		return [
			{ title: get("TutoExplainTitle"), intro: get("TutoExplainContent") },
			{ element: "#lOLGameApp_box", position: "top", title: get("TutoBoardTitle"), intro: get("TutoBoardContent") },
			step("#new-game-button", "TutoNewgame"),
			step("#level-easy-button", "TutoEasy"),
			step("#level-medium-button", "TutoMedium"),
			step("#level-hard-button", "TutoHard"),
			step("#switch-player-button", "TutoSwitch"),
			step("#network-button", "TutoNetwork")
		];
	}
};
