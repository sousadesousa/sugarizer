// Steps of the tutorial, with texts from the localization
var TankOpTutorial = {
	// playing is true on the play screen
	steps: function(get, playing) {
		var step = function(element, position, key) {
			return { element: element, position: position, title: get(key + "Title"), intro: get(key + "Content") };
		};
		if (!playing) {
			return [
				{ title: get("TutoExplainTitle"), intro: get("TutoExplainContent") },
				step("#app_missions", "top", "TutoChangeMission"),
				step("#app_start", "top", "TutoStartActivity"),
				step("#app_completed", "top", "TutoCompletedMissions"),
				step("#fullscreen-button", "bottom", "TutoFullScreenButton"),
				step("#stop-button", "left", "TutoStopButton"),
				step("#app_credit", "left", "TutoCredits")
			];
		}
		return [
			{ title: get("TutoPlayExplainTitle"), intro: get("TutoPlayExplainContent") },
			step("canvas", "right", "TutoGame"),
			step("#play_keyboard", "left", "TutoPlayControls"),
			{ element: "#play_key_fire", position: "top", title: get("TutoPlayFire"), intro: get("TutoPlayFireContent") },
			step("#play_wave", "left", "TutoWave"),
			step("#play_score", "left", "TutoScore"),
			step("#play_home", "top", "TutoPlayHome")
		];
	}
};
