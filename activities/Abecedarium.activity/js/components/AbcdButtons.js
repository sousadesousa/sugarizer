// Buttons of the activity

// Go back to the home screen
const AbcdHomeButton = {
	template: `
		<div>
			<img :id="id + '_home'" src="images/home.png" class="standardButton backButton" @click="goHome">
		</div>
	`,
	props: { id: String },
	methods: {
		goHome: function() {
			Abcd.goHome();
		}
	}
};

// Switch between upper case, script and lower case
const AbcdCaseButton = {
	template: `
		<div class="switchCase" :style="{visibility: state.fullscreen ? 'hidden' : 'visible'}">
			<img :src="'images/case' + state.casevalue + '.png'" class="standardButton switchCaseButton" @click="next">
		</div>
	`,
	data: function() {
		return { state: Abcd.state };
	},
	methods: {
		next: function() {
			this.state.casevalue = (parseInt(this.state.casevalue) + 1) % 3;
		}
	}
};

// Switch between English, French and Spanish
const AbcdLanguageButton = {
	template: `
		<div class="switchLang" :style="{visibility: state.fullscreen ? 'hidden' : 'visible'}">
			<img :src="flag" class="standardButton switchLangButton" @click="next">
		</div>
	`,
	data: function() {
		return { state: Abcd.state };
	},
	computed: {
		flag: function() {
			return "images/" + (this.state.lang == "en" ? "us" : this.state.lang) + ".png";
		}
	},
	methods: {
		next: function() {
			var languages = Abcd.languages;
			this.state.lang = languages[(languages.indexOf(this.state.lang) + 1) % languages.length];
		}
	}
};

// Button to choose a type of game
const AbcdPlayTypeButton = {
	template: `
		<div class="play-type-button">
			<div :class="theme">
				<img class="playtypeImageFrom" :src="image(from)">
				<img class="playtypeImageArrow" src="images/arrow.png">
				<img class="playtypeImageTo" :src="image(to)">
			</div>
		</div>
	`,
	props: { from: String, to: String, theme: String },
	data: function() {
		return { state: Abcd.state };
	},
	methods: {
		// Letters follow the current case
		image: function(name) {
			return "images/" + (name.substr(0, 6) == "letter" ? "letter" + this.state.casevalue : name) + ".png";
		}
	}
};
