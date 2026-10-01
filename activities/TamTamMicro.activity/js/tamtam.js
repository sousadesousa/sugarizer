// TamTam Micro shared code: database, state and sound player
var TamTam = {};

TamTam.database = [
	"acguit", "alarm", "armbone", "au_pipes", "babylaugh", "babyuhoh", "banjo", "basse", "basse2", "bird", "bottle",
	"bubbles", "byke", "camera", "car", "carhorn", "cat", "cello", "chiken", "chimes", "clang", "clang2", "clarinette",
	"clavinet", "cling", "cow", "crash", "cricket", "diceinst", "didjeridu", "dog", "door", "duck", "duck2", "fingercymbals",
	"flugel", "flute", "foghorn", "frogs", "gam", "guit", "guit2", "guitmute", "guitshort", "harmonica", "harmonium",
	"harpsichord", "hey", "horse", "kalimba", "koto", "laugh", "mando", "marimba", "ocarina", "ounk", "ow", "piano",
	"plane", "rhodes", "sarangi", "saxo", "saxsoprano", "sheep", "shenai", "sitar", "slap", "templebell", "triangle",
	"trumpet", "tuba", "ukulele", "violin", "voix", "water", "zap"
];

TamTam.collections = [
	{ name: "all", content: TamTam.database },
	{ name: "animals", content: [
		"bird", "cat", "chiken", "cow", "cricket", "dog", "duck", "duck2", "frogs", "horse", "ounk", "sheep"
	]},
	{ name: "concret", content: [
		"alarm", "bottle", "bubbles", "byke", "camera", "car", "carhorn", "clang", "cling", "crash", "diceinst",
		"door", "plane", "slap", "water", "zap"
	]},
	{ name: "keyboard", content: [
		"clavinet", "harmonium", "harpsichord", "piano", "rhodes"
	]},
	{ name: "people", content: [
		"armbone", "babylaugh", "babyuhoh", "hey", "laugh", "ow", "voix"
	]},
	{ name: "percussions", content: [
		"chimes", "clang2", "fingercymbals", "gam", "kalimba", "marimba", "templebell", "triangle"
	]},
	{ name: "strings", content: [
		"acguit", "banjo", "basse", "basse2", "cello", "guit", "guit2", "guitmute", "guitshort", "koto",
		"mando", "sitar", "ukulele", "violin"
	]},
	{ name: "winds", content: [
		"au_pipes", "clarinette", "didjeridu", "flugel", "flute", "foghorn", "harmonica", "ocarina",
		"saxo", "saxsoprano", "shenai", "trumpet", "tuba"
	]}
];

// Reactive state shared by the components
TamTam.state = Vue.reactive({
	// "instruments", "piano" or "simon"
	mode: "instruments",
	// Collection displayed in the instruments mode
	collection: 0,
	// Sound used by the piano and by the simon game
	currentPiano: "piano",
	currentSimon: "piano",
	// Colors of the user
	userColor: { stroke: "#005FE4", fill: "#FF2B34" }
});

// Plays sounds with Tone.js, shifting the pitch
TamTam.TonePlayer = function() {
	this.player = new Tone.Player();
	this.pitchShift = new Tone.PitchShift();
};

TamTam.TonePlayer.prototype = {
	load: function(file, callback) {
		var that = this;
		if (/iPad/i.test(navigator.userAgent) || /iPhone/i.test(navigator.userAgent)) {
			that.player.load(file + "?time=" + (new Date().getTime()), callback);
			return;
		}
		// HACK: Use XHR Blob because Tone.Buffer can't load file from file:///
		var xhr = new XMLHttpRequest();
		xhr.open("GET", file + "?time=" + (new Date().getTime()), true);
		xhr.responseType = "blob";
		xhr.onload = function() {
			that.player.load(URL.createObjectURL(this.response), callback);
		};
		xhr.send();
	},

	play: function(pitch) {
		this.pitchShift.pitch = pitch;
		this.pitchShift.toMaster();
		this.player.connect(this.pitchShift);
		this.player.start();
	},

	playSound: function(file) {
		var that = this;
		this.load(file, function() {
			that.play(0);
		});
	},

	destroy: function() {
		this.pitchShift.disconnect();
		this.pitchShift.dispose();
		this.player.disconnect();
		this.player.dispose();
	}
};
