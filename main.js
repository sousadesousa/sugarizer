// Main file, used only for Electron
const electron = require("electron"),
	fs = require("fs"),
	temp = require("tmp"),
	path = require("path"),
	activities = require("./activities.json"),
	i18next = require("./lib/i18next.min.js");

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const ipc = electron.ipcMain;
const dialog = electron.dialog;
const nativeImage = electron.nativeImage;
const shell = electron.shell;
const navigation = require("./navigation.js");
const ipcValidation = require("./ipc-validation.js");

// Directories chosen by the user with the "choose directory" dialog: the only ones the renderer can save into
const chosenDirectories = new Set();

let mainWindow = null;

let debug = false;
let frameless = true;
let reinit = false;
let logoff = false;
let launch = null;

// Save a file
function saveFile(file, arg, sender) {
	var buf;
	if (arg.text) {
		buf = arg.text;
	} else {
		buf = Buffer.from(arg.binary, "base64");
	}
	fs.writeFile(file, buf, function (err) {
		sender.send("save-file-reply", { err: err, filename: file });
	});
}

// Load a file
function LoadFile(event, file) {
	var extension = path.extname(file).substr(1);
	var fileProperty = {};
	fileProperty.name = path.basename(file);
	var extToMimetypes = {
		json: "application/json",
		jpg: "image/jpeg",
		png: "image/png",
		wav: "audio/wav",
		webm: "video/webm",
		mp3: "audio/mp3",
		mp4: "video/mp4",
		txt: "text/plain",
		pdf: "application/pdf",
		doc: "application/msword",
		odt: "application/vnd.oasis.opendocument.text",
	};
	for (var ext in extToMimetypes) {
		if (ext == extension) {
			fileProperty.type = extToMimetypes[ext];
			break;
		}
	}
	var json = extension == "json" ? "utf8" : null;
	fs.readFile(file, json, function (err, data) {
		if (err) {
			event.sender.send("choose-files-reply", fileProperty, err.message, null);
			return;
		}
		var text = json
			? data
			: "data:" +
			  fileProperty.type +
			  ";base64," +
			  data.toString("base64");
		event.sender.send("choose-files-reply", fileProperty, err, text);
	});
}

// Generate a fake UUID v4
function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0,
			v = c === 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

function createWindow() {
	// Process argument
	for (var i = 0; i < process.argv.length; i++) {
		if (process.argv[i] == "--sdebug") {
			debug = true;
		} else if (process.argv[i] == "--window") {
			frameless = false;
		} else if (process.argv[i] == "--init") {
			reinit = true;
		} else if (process.argv[i] == "--logoff") {
			logoff = true;
		} else if (process.argv[i] == "--launch") {
			if (i + 1 < process.argv.length) {
				let activity = process.argv[i + 1];
				if (activity.indexOf("&") != -1) {
					activity = activity.split("&")[0];
				}
				for (var j = 0; j < activities.length; j++) {
					if (activities[j].id == activity) {
						launch =
							"file://" +
							app.getAppPath() +
							"/" +
							activities[j].directory +
							"/index.html?n=" +
							activities[j].name +
							"&a=" +
							process.argv[i + 1] +
							"&aid=" +
							uuidv4();
						break;
					}
				}
			}
		}
	}

	// Create the browser window
	mainWindow = new BrowserWindow({
		show: false,
		backgroundColor: "#FFF",
		minWidth: 640,
		minHeight: 480,
		fullscreen: frameless,
		frame: !frameless,
		webPreferences: {
			webSecurity: true,
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			preload: path.join(__dirname, "preload.js"),
		},
		icon: nativeImage.createFromPath("./res/icon/electron/icon-1024.png"),
	});
	// Only the pages of the application can be shown, links to the web go to the system browser
	navigation.guardWindow(mainWindow.webContents, app.getAppPath(), function(url) {
		shell.openExternal(url);
	});
	if (process.platform === "darwin") {
		app.dock.setIcon(app.getAppPath() + "/res/icon/electron/icon-1024.png");
	}

	// Load the index.html of Sugarizer
	mainWindow.loadURL(
		launch
			? launch
			: "file://" +
					app.getAppPath() +
					"/index.html" +
					(reinit ? "?rst=1" : "") +
					(logoff ? "?rst=2" : "")
	);
	if (frameless) {
		mainWindow.maximize();
	}

	// Wait for 'ready-to-show' to display our window
	mainWindow.webContents.once("did-finish-load", function () {
		// Handle save file dialog
		ipc.on("save-file-dialog", function (event, arg) {
			var request = ipcValidation.validateSaveRequest(arg, chosenDirectories);
			if (!request.ok) {
				event.sender.send("save-file-reply", { err: request.error, filename: null });
				return;
			}
			var saveFunction = function (file) {
				if (file) {
					saveFile(file, arg, event.sender);
				}
			};
			if (!request.target) {
				// Ask directory to use, then save
				var dialogSettings = {
					defaultPath: request.filename,
					filters: [
						{ name: String(arg.mimetype), extensions: [String(arg.extension)] },
					],
				};
				dialogSettings.title = i18next.t("SaveFile");
				dialogSettings.buttonLabel = i18next.t("Save");
				dialog.showSaveDialog(dialogSettings).then(function (result) {
					saveFunction(result.filePath);
				});
			} else {
				// Save in a directory chosen by the user
				saveFunction(request.target);
			}
		});
		ipc.on("choose-directory-dialog", function (event) {
			var dialogSettings = {
				properties: ["openDirectory", "createDirectory"],
			};
			dialogSettings.title = i18next.t("ChooseDirectory");
			dialogSettings.buttonLabel = i18next.t("Choose");
			dialog.showOpenDialog(dialogSettings).then(function (result) {
				var files = result.filePaths;
				if (files && files.length > 0) {
					chosenDirectories.add(path.resolve(files[0]));
					event.sender.send("choose-directory-reply", files[0]);
				}
			});
		});
		ipc.on("choose-files-dialog", function (event) {
			var dialogSettings = {
				properties: ["openFile", "multiSelections"],
				filters: [
					{
						name: "Activities",
						extensions: [
							"jpg",
							"png",
							"json",
							"webm",
							"wav",
							"mp3",
							"mp4",
							"pdf",
							"txt",
							"doc",
							"odt",
						],
					},
				],
			};
			dialogSettings.title = i18next.t("ChooseFiles");
			dialogSettings.buttonLabel = i18next.t("Choose");
			dialogSettings.filters[0].name = i18next.t("FilesSupported");
			dialog.showOpenDialog(dialogSettings).then(function (result) {
				var files = result.filePaths;
				if (files && files.length > 0) {
					for (var i = 0; i < files.length; i++) {
						LoadFile(event, files[i]);
					}
				}
			});
		});
		ipc.on("create-tempfile", function (event, arg) {
			var request = ipcValidation.validateTempfileRequest(arg);
			if (!request.ok) {
				event.sender.send("create-tempfile-reply", null);
				return;
			}
			temp.file("sugarizer", function (err, tempPath, fd) {
				if (err) {
					event.sender.send("create-tempfile-reply", null);
					return;
				}
				fs.writeFile(fd, request.buffer, function (err) {
					fs.close(fd, function () {
						event.sender.send("create-tempfile-reply", err ? null : tempPath);
					});
				});
			});
		});

		// Build menu
		var template = [];
		if (process.platform === "darwin") {
			var appname = electron.app.getName();
			var menu = {
				label: appname,
				submenu: [
					{
						accelerator: "Command+Q",
						click: function () {
							app.quit();
						},
					},
				],
			};
			menu.submenu[0].label = i18next.t("Quit");
			template.unshift(menu);

			const { systemPreferences } = require("electron");
			systemPreferences.askForMediaAccess("microphone");
			systemPreferences.askForMediaAccess("camera");
		}
		Menu.setApplicationMenu(Menu.buildFromTemplate(template));

		// Debug console
		if (debug) {
			var devtools = new BrowserWindow();
			mainWindow.webContents.setDevToolsWebContents(devtools.webContents);
			mainWindow.webContents.openDevTools({ mode: "detach" });
		}

		// Show wmain window
		mainWindow.show();
	});

	// Emitted when the window is closed
	mainWindow.on("closed", function () {
		mainWindow = null;
	});
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
	app.quit();
});

app.on("activate", function () {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});

let triedFallback = false;
function setupI18next(language) {
	return new Promise((resolve, reject) => {
		const filePath = path.join(__dirname, "locales", `${language}.json`);

		fs.readFile(filePath, "utf8", (err, data) => {
			if (err) {
				if (err.errno === -4058 && !triedFallback) {
					triedFallback = true;
					setupI18next("en").then(resolve).catch(reject);
					return;
				} else {
					console.error("Cannot load language: ", language);
					reject(err);
				}
			}

			// Parse the JSON data
			let translations;
			try {
				translations = JSON.parse(data);
			} catch (parseError) {
				console.error(
					"Failed to parse the language file: ",
					language,
					parseError
				);
				reject(parseError);
			}

			// Initialize i18next with the loaded data
			i18next.init(
				{
					lng: language,
					resources: {
						[language]: {
							translation: translations,
						},
					},
				},
				(initErr) => {
					if (initErr) {
						console.error("Failed to init i18next: ", initErr);
						reject(initErr);
					}
					resolve();
				}
			);
		});
	});
}

// Initialize locales asynchronously
setupI18next(app.getLocale() || "en");
