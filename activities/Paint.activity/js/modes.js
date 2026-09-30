// Drawing modes: each mode handles the pointer on the canvas
// Handlers receive the Paint app and the pointer position in canvas pixels (CSS pixels)

// Load a text file, also from file:// URLs (desktop and mobile apps)
function loadText(url, callback) {
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.onload = function() {
		if (request.status === 200 || request.status === 0) {
			callback(request.responseText);
		}
	};
	request.send(null);
}

// Stamps are available in a version for each browser engine
function stampPlatform() {
	return typeof InstallTrigger !== "undefined" ? "gecko" : "webkit";
}

// Set colors of a Sugar SVG icon (with fill_color and stroke_color entities)
function changeColors(iconData, fillColor, strokeColor) {
	iconData = iconData.replace(/<!ENTITY fill_color "(.*?)">/g, "<!ENTITY fill_color \"" + fillColor + "\">");
	iconData = iconData.replace(/<!ENTITY stroke_color "(.*?)">/g, "<!ENTITY stroke_color \"" + strokeColor + "\">");
	return iconData;
}

// Add an element floating over the canvas, centered on a point
function addFloatingElement(paint, element, point) {
	var top = paint.canvasTop();
	element.style.position = "absolute";
	element.style.padding = "0px";
	element.style.border = "5px dotted #500";
	document.body.appendChild(element);
	var rect = element.getBoundingClientRect();
	element.style.left = point.x - rect.width / 2 + "px";
	element.style.top = point.y + top - rect.height / 2 + "px";
	return {
		element: element,
		startPoint: {
			x: point.x,
			y: point.y + top
		}
	};
}

// Center a floating element on its start point after a resize
function recenter(current) {
	var rect = current.element.getBoundingClientRect();
	current.element.style.left = current.startPoint.x - rect.width / 2 + "px";
	current.element.style.top = current.startPoint.y - rect.height / 2 + "px";
}

// Distance of the pointer from the start point of a floating element
function distanceFromStart(paint, current, point) {
	return {
		x: Math.abs(point.x - current.startPoint.x),
		y: Math.abs(point.y + paint.canvasTop() - current.startPoint.y)
	};
}

// Position of a floating element in the canvas, without its border
function innerBox(paint, element) {
	var rect = element.getBoundingClientRect();
	return {
		left: rect.left + 5,
		top: rect.top - paint.canvasTop() + 5,
		width: rect.width - 10,
		height: rect.height - 10
	};
}

// Draw a line on the canvas and on the canvas of other users
function drawLine(paint, color, from, to) {
	var ctx = paint.context();
	ctx.beginPath();
	ctx.strokeStyle = color;
	ctx.lineCap = "round";
	ctx.lineWidth = paint.size;
	ctx.moveTo(from.x, from.y);
	ctx.lineTo(to.x, to.y);
	ctx.stroke();

	if (paint.isShared) {
		paint.sendMessage({
			action: "path",
			data: {
				lineWidth: paint.size,
				lineCap: "round",
				strokeStyle: color,
				from: from,
				to: to
			}
		});
	}
}

// Pen and eraser draw lines following the pointer
function lineMode(color) {
	return {
		point: null,
		onMouseDown: function(paint, point) {
			this.point = point;
			drawLine(paint, color(paint), {x: point.x + 1, y: point.y + 1}, point);
		},
		onMouseDrag: function(paint, point) {
			if (!this.point) {
				return;
			}
			drawLine(paint, color(paint), this.point, point);
			this.point = point;
		},
		onMouseUp: function(paint) {
			this.point = null;
			paint.saveCanvas();
		}
	};
}

// Flood fill of the area around a pixel
function floodfill(x, y, fillcolor, ctx, width, height, tolerance) {
	var img = ctx.getImageData(0, 0, width, height);
	var data = img.data;
	var length = data.length;
	var Q = [];
	var i = (x + y * width) * 4;
	var e = i,
		w = i,
		me, mw, w2 = width * 4;
	var targetcolor = [data[i], data[i + 1], data[i + 2], data[i + 3]];
	if (!pixelCompare(i, targetcolor, fillcolor, data, length, tolerance)) {
		return false;
	}
	Q.push(i);
	while (Q.length) {
		i = Q.pop();
		if (pixelCompareAndSet(i, targetcolor, fillcolor, data, length, tolerance)) {
			e = i;
			w = i;
			mw = parseInt(i / w2) * w2;
			me = mw + w2;
			while (mw < (w -= 4) && pixelCompareAndSet(w, targetcolor, fillcolor, data, length, tolerance));
			while (me > (e += 4) && pixelCompareAndSet(e, targetcolor, fillcolor, data, length, tolerance));
			for (var j = w; j < e; j += 4) {
				if (j - w2 >= 0 && pixelCompare(j - w2, targetcolor, fillcolor, data, length, tolerance)) {
					Q.push(j - w2);
				}
				if (j + w2 < length && pixelCompare(j + w2, targetcolor, fillcolor, data, length, tolerance)) {
					Q.push(j + w2);
				}
			}
		}
	}
	ctx.putImageData(img, 0, 0);
	return true;
}

function pixelCompare(i, targetcolor, fillcolor, data, length, tolerance) {
	if (i < 0 || i >= length) {
		return false;
	}
	if (data[i + 3] === 0) {
		return true;
	}
	if (targetcolor[3] === fillcolor.a && targetcolor[0] === fillcolor.r && targetcolor[1] === fillcolor.g && targetcolor[2] === fillcolor.b) {
		return false;
	}
	if (targetcolor[3] === data[i + 3] && targetcolor[0] === data[i] && targetcolor[1] === data[i + 1] && targetcolor[2] === data[i + 2]) {
		return true;
	}
	return Math.abs(targetcolor[3] - data[i + 3]) <= 255 - tolerance && Math.abs(targetcolor[0] - data[i]) <= tolerance && Math.abs(targetcolor[1] - data[i + 1]) <= tolerance && Math.abs(targetcolor[2] - data[i + 2]) <= tolerance;
}

function pixelCompareAndSet(i, targetcolor, fillcolor, data, length, tolerance) {
	if (pixelCompare(i, targetcolor, fillcolor, data, length, tolerance)) {
		data[i] = fillcolor.r;
		data[i + 1] = fillcolor.g;
		data[i + 2] = fillcolor.b;
		data[i + 3] = 255;
		return true;
	}
	return false;
}

// Components of a "rgb(r, g, b)" color
function parseColor(color) {
	var parts = color.slice(color.indexOf("(") + 1, -1).split(",");
	return {
		a: 1,
		r: parseInt(parts[0]),
		g: parseInt(parts[1]),
		b: parseInt(parts[2])
	};
}

var PaintModes = {
	Pen: lineMode(function(paint) {
		return paint.fillColor;
	}),

	Eraser: lineMode(function() {
		return "#fff";
	}),

	// Fill an area with the fill color
	Bucket: {
		onMouseDown: function(paint, point) {
			var ctx = paint.context();
			var ratio = window.devicePixelRatio;
			var fillColor = parseColor(paint.fillColor);

			// Nothing to do if the clicked point already has the color
			// (not a strict equality: browsers slightly change some colors)
			var p = ctx.getImageData(point.x * ratio, point.y * ratio, 1, 1).data;
			if (Math.abs(p[0] - fillColor.r) <= 10 && Math.abs(p[1] - fillColor.g) <= 10 && Math.abs(p[2] - fillColor.b) <= 10) {
				return;
			}
			floodfill(parseInt(point.x * ratio), parseInt(point.y * ratio), fillColor, ctx, ctx.canvas.width, ctx.canvas.height, 5);

			paint.saveCanvas();
			paint.broadcastCanvas();
		},
		onMouseDrag: function() {},
		onMouseUp: function() {}
	},

	// Write the text of the text palette, drag to change its size
	Text: {
		defaultSize: 25,
		onMouseDown: function(paint, point) {
			paint.removeFloatingElement();
			var text = paint.text.text;
			if (!text) {
				return;
			}
			var element = document.createElement("span");
			element.innerText = text;
			element.style.whiteSpace = "nowrap";
			element.style.fontFamily = paint.text.fontFamily;
			element.style.lineHeight = paint.text.lineHeight;
			element.style.fontSize = this.defaultSize + "px";
			element.style.opacity = "0.5";
			element.style.color = paint.fillColor;
			paint.currentElement = addFloatingElement(paint, element, point);
			paint.currentElement.type = "text";
		},
		onMouseDrag: function(paint, point) {
			var current = paint.currentElement;
			if (!current) {
				return;
			}
			var distance = distanceFromStart(paint, current, point);
			current.element.style.fontSize = this.defaultSize + Math.max(distance.x, distance.y) + "px";
			recenter(current);
		},
		onMouseUp: function(paint) {
			var current = paint.currentElement;
			if (!current) {
				return;
			}
			var rect = current.element.getBoundingClientRect();
			var data = {
				font: current.element.style.fontSize + " " + paint.text.fontFamily,
				fillStyle: paint.fillColor,
				textAlign: "start",
				text: current.element.innerText,
				left: 5 + rect.left,
				top: rect.top - paint.canvasTop() + rect.height
			};
			paint.drawText(data);
			if (paint.isShared) {
				paint.sendMessage({action: "text", data: data});
			}
			paint.removeFloatingElement();
			paint.saveCanvas();
		}
	},

	// Put a stamp of the stamp palette, drag to change its size
	Stamp: {
		defaultSize: 80,
		releasedFinger: false,
		onMouseDown: function(paint, point) {
			var mode = this;
			mode.releasedFinger = false;
			paint.removeFloatingElement();
			loadText(paint.stamp.stamp, function(svg) {
				var element = document.createElement("img");
				element.onload = function() {
					element.style.width = mode.defaultSize + "px";
					element.style.height = mode.defaultSize + "px";
					paint.currentElement = addFloatingElement(paint, element, point);
					paint.currentElement.type = "stamp";

					// A short tap can end before the stamp is loaded
					if (mode.releasedFinger) {
						mode.drawStamp(paint);
					}
				};
				element.src = "data:image/svg+xml;base64," + btoa(changeColors(svg, paint.fillColor, paint.strokeColor));
			});
		},
		onMouseDrag: function(paint, point) {
			var current = paint.currentElement;
			if (!current) {
				return;
			}
			var distance = distanceFromStart(paint, current, point);
			var width = distance.x, height = distance.y;
			if (paint.stamp.proportionnal) {
				width = height = Math.max(distance.x, distance.y);
			}
			current.element.style.width = this.defaultSize + width + "px";
			current.element.style.height = this.defaultSize + height + "px";
			recenter(current);
		},
		onMouseUp: function(paint) {
			this.releasedFinger = true;
			if (paint.currentElement) {
				this.drawStamp(paint);
			}
		},
		drawStamp: function(paint) {
			var box = innerBox(paint, paint.currentElement.element);
			paint.context().drawImage(paint.currentElement.element, box.left, box.top, box.width, box.height);
			if (paint.isShared) {
				paint.sendMessage({
					action: "drawStamp",
					data: {
						stampBase: paint.stamp.stampBase,
						color: {
							fill: paint.fillColor,
							stroke: paint.strokeColor
						},
						left: box.left,
						top: box.top,
						width: box.width,
						height: box.height
					}
				});
			}
			paint.removeFloatingElement();
			paint.saveCanvas();
		}
	},

	// Select an area to copy, then switch to paste mode
	Copy: {
		begin: null,
		onMouseDown: function(paint, point) {
			paint.removeFloatingElement();
			this.begin = point;
			var element = document.createElement("div");
			element.style.width = "1px";
			element.style.height = "1px";
			element.style.opacity = "0.5";
			element.style.pointerEvents = "none";
			paint.currentElement = addFloatingElement(paint, element, point);
			paint.currentElement.type = "copy/paste";
		},
		onMouseDrag: function(paint, point) {
			if (!paint.currentElement || !this.begin) {
				return;
			}
			var style = paint.currentElement.element.style;
			style.width = Math.max(point.x - this.begin.x, 0) + "px";
			style.height = Math.max(point.y - this.begin.y, 0) + "px";
		},
		onMouseUp: function(paint, point) {
			var begin = this.begin;
			this.begin = null;
			if (!paint.currentElement || !begin || begin.x >= point.x || begin.y >= point.y) {
				return;
			}
			var width = parseInt(paint.currentElement.element.style.width);
			var height = parseInt(paint.currentElement.element.style.height);
			var ratio = window.devicePixelRatio;
			var imageData = paint.context().getImageData(begin.x * ratio, begin.y * ratio, width * ratio, height * ratio);
			var copy = document.createElement("canvas");
			copy.width = width * ratio;
			copy.height = height * ratio;
			copy.getContext("2d").putImageData(imageData, 0, 0);
			paint.pasteImage = {
				width: width,
				height: height,
				data: copy.toDataURL()
			};
			paint.setMode("Paste");
		}
	},

	// Paste the copied area, drag to move it
	Paste: {
		onMouseDown: function(paint, point) {
			paint.removeFloatingElement();
			if (!paint.pasteImage) {
				return;
			}
			var element = document.createElement("img");
			element.src = paint.pasteImage.data;
			element.style.width = paint.pasteImage.width + "px";
			element.style.height = paint.pasteImage.height + "px";
			paint.currentElement = addFloatingElement(paint, element, point);
			paint.currentElement.type = "paste";
		},
		onMouseDrag: function(paint, point) {
			var current = paint.currentElement;
			if (!current || current.type != "paste") {
				return;
			}
			current.startPoint = {x: point.x, y: point.y + paint.canvasTop()};
			recenter(current);
		},
		onMouseUp: function(paint) {
			var current = paint.currentElement;
			if (!current || current.type != "paste") {
				return;
			}
			var box = innerBox(paint, current.element);
			paint.context().drawImage(current.element, box.left, box.top, box.width, box.height);
			if (paint.isShared) {
				paint.sendMessage({
					action: "drawImage",
					data: {
						src: current.element.src,
						left: box.left,
						top: box.top,
						width: box.width,
						height: box.height
					}
				});
			}
			paint.removeFloatingElement();
			paint.saveCanvas();
		}
	}
};

// Filters applied to the whole canvas
var PaintFilters = {
	invert: function(pixels) {
		for (var i = 0; i < pixels.length; i += 4) {
			pixels[i] = 255 - pixels[i];
			pixels[i + 1] = 255 - pixels[i + 1];
			pixels[i + 2] = 255 - pixels[i + 2];
		}
	},
	grayscale: function(pixels) {
		for (var i = 0; i < pixels.length; i += 4) {
			var gray = pixels[i] * 0.3 + pixels[i + 1] * 0.59 + pixels[i + 2] * 0.11;
			pixels[i] = gray;
			pixels[i + 1] = gray;
			pixels[i + 2] = gray;
		}
	}
};
