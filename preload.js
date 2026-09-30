// Preload script, used only for Electron
// Gives the web page the few native features it needs, without giving it Node.js

var electron = require('electron');
var ipc = electron.ipcRenderer;

// Messages the page can send to the main process, and replies it can receive
var sendChannels = ['save-file-dialog', 'choose-directory-dialog', 'choose-files-dialog', 'create-tempfile', 'open-external'];
var receiveChannels = ['save-file-reply', 'choose-directory-reply', 'choose-files-reply', 'create-tempfile-reply'];

electron.contextBridge.exposeInMainWorld('sugarizerElectron', {
	// Send a message to the main process
	send: function(channel, arg) {
		if (sendChannels.indexOf(channel) == -1) {
			throw new Error('Unknown channel ' + channel);
		}
		ipc.send(channel, arg);
	},

	// Listen to replies on a channel, replacing previous listeners
	listen: function(channel, callback) {
		if (receiveChannels.indexOf(channel) == -1) {
			throw new Error('Unknown channel ' + channel);
		}
		ipc.removeAllListeners(channel);
		ipc.on(channel, function(event) {
			callback.apply(null, Array.prototype.slice.call(arguments, 1));
		});
	},

	// Open an URL or a file with the system default application
	openExternal: function(url) {
		ipc.send('open-external', url);
	}
});
