//Copyright (c) 2013, Playful Invention Company.

//Permission is hereby granted, free of charge, to any person obtaining a copy
//of this software and associated documentation files (the "Software"), to deal
//in the Software without restriction, including without limitation the rights
//to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//copies of the Software, and to permit persons to whom the Software is
//furnished to do so, subject to the following conditions:

//The above copyright notice and this permission notice shall be included in
//all copies or substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//THE SOFTWARE.

// -----

// GridPaint has been kept extremely minimal as an explicit design choice.
// If you want to add features please make a fork with a different name.
// Thanks in advance

var onStart, onMove, onEnd;
var zoom;
var touchScreen = false;

function eventInit(){
	touchScreen = ('ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0);
	// Register both touch and mouse listeners always
	var canvas = document.getElementById("canvas");
	canvas.addEventListener("touchstart", evMousedown, false);
	canvas.addEventListener("mousedown", evMousedown, false);
	frame.addEventListener("touchmove", evMousemove, false);
	frame.addEventListener("mousemove", evMousemove, false);
	frame.addEventListener("touchend", evMouseup, false);
	frame.addEventListener("mouseup", evMouseup, false);
	computeSize();
	window.addEventListener('resize', computeSize);
}

function computeSize() {
	var toolbarHeight = (document.getElementById("unfullscreen-button").style.visibility!="visible"?document.getElementById("main-toolbar").offsetHeight:0);
	var availableWidth = document.body.clientWidth;
	var availableHeight = document.body.clientHeight - toolbarHeight;
	zoom = Math.min(availableWidth/1024, availableHeight/748);
	var frame = document.getElementById("frame");
	var leftMargin = (availableWidth - 1024*zoom)/2;
	frame.style.marginLeft = leftMargin+"px";
	// centre vertically with a margin (like the horizontal one) so that frame.getBoundingClientRect() stays the origin of the drawing
	frame.style.marginTop = (Math.max(0, (availableHeight - 748*zoom)/2))+"px";
	var setTransform = function(element) {
		element.style.transform = "scale("+zoom+","+zoom+")";
		element.style.transformOrigin = "0% 0%";
		element.style.width = "1024px";
		element.style.height = "748px";
	}
	setTransform(document.getElementById("gridcnv"));
	setTransform(document.getElementById("hitbuffer"));
	setTransform(document.getElementById("thumbframe"));
}

function evMousedown(e){
	e.preventDefault();
	// Get the touch point if it's a touch event, otherwise use the event itself
	var touch = e.touches ? e.touches[0] : e;
	var x=localx(touch.clientX), y=localy(touch.clientY);
	onStart(x,y);
	// HACK: Force refresh on Android
	if (/Android/i.test(navigator.userAgent) && document.location.protocol.substr(0,4) != "http") {
		cnv.style.display='none';
		cnv.offsetHeight;
		cnv.style.display='block';
	}
}


function evMousemove(e){
	e.preventDefault();
	if(!onMove) return;
	// Get the touch point if it's a touch event, otherwise use the event itself
	var touch = e.touches ? e.touches[0] : e;
	var x=localx(touch.clientX), y=localy(touch.clientY);
	onMove(x,y);
}

function evMouseup(e){
	e.preventDefault();
	if(!onEnd) return;
	onEnd();
}

function localx(gx){return (gx-frame.getBoundingClientRect().left)/zoom;}
function localy(gy){
	return (gy-frame.getBoundingClientRect().top)/zoom;
}
