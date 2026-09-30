// Steps of the tutorial, with texts from the localization
var PaintTutorial = {
	steps: function(get) {
		var steps = [{
			title: get("TutoExplainTitle"),
			intro: get("TutoExplainContent")
		}];
		var elements = [
			["colors-button-fill", "TutoColorsButtonFill"],
			["colors-button-stroke", "TutoColorsButtonStroke"],
			["undo-button", "TutoUndo"],
			["redo-button", "TutoRedo"],
			["size-button", "TutoSize"],
			["pen-button", "TutoPen"],
			["eraser-button", "TutoEraser"],
			["stamps-button", "TutoStamps"],
			["text-button", "TutoText"],
			["insertimage-button", "TutoInsertimage"],
			["drawings-button", "TutoDrawings"],
			["bucket-button", "TutoBucket"],
			["filters-button", "TutoFilters"],
			["copy-button", "TutoCopy"],
			["paste-button", "TutoPaste"],
			["save-image-button", "TutoSaveImageButton"],
			["clear-button", "TutoClear"],
			["network-button", "TutoNetwork"]
		];
		elements.forEach(function(element) {
			steps.push({
				element: "#" + element[0],
				position: "bottom",
				title: get(element[1] + "Title"),
				intro: get(element[1] + "Content")
			});
		});
		return steps;
	}
};
