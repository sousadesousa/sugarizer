// An item of the board, selected or not
const LolItem = {
	template: `
		<div class="lol-item" :class="{'lol-item-selected': selected}" :style="{backgroundColor: selected ? state.userColor.stroke : state.userColor.fill}"></div>
	`,
	props: { selected: Boolean },
	data: function() {
		return { state: LOL.state };
	}
};
