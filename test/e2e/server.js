// Minimal static web server used by end-to-end tests
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../..");
const port = parseInt(process.env.PORT || "8765");
const types = {
	".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
	".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
	".gif": "image/gif", ".ico": "image/x-icon", ".webp": "image/webp", ".wasm": "application/wasm",
	".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".webm": "video/webm", ".mp4": "video/mp4",
	".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".txt": "text/plain",
	".xml": "application/xml", ".ini": "text/plain", ".md": "text/plain", ".pdf": "application/pdf"
};

const server = http.createServer(function(req, res) {
	let file = path.join(root, decodeURIComponent(new URL(req.url, "http://localhost").pathname));
	if (!file.startsWith(root)) {
		res.writeHead(403);
		return res.end();
	}
	if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
		file = path.join(file, "index.html");
	}
	fs.readFile(file, function(err, data) {
		if (err) {
			res.writeHead(404);
			return res.end("Not found");
		}
		res.writeHead(200, {"Content-Type": types[path.extname(file).toLowerCase()] || "application/octet-stream"});
		res.end(data);
	});
});
// keep idle connections longer than the browser does: a connection closed by
// the server while the browser reuses it makes a script fail to load
server.keepAliveTimeout = 120000;
server.headersTimeout = 125000;
server.listen(port, "127.0.0.1", function() {
	console.log("Serving " + root + " on http://127.0.0.1:" + port);
});
