/* Title bar of the redesign: a back button and the activity name in the toolbar.
   Load it with a plain <script> in the activity's index.html, after the toolbar.
   Back does what Stop does (the activity saves and returns to the Home). */
(function () {
	function build() {
		var bar = document.getElementById("main-toolbar");
		var stop = document.getElementById("stop-button");
		if (!bar || !stop || bar.querySelector(".rd-back")) {
			return;
		}
		document.body.classList.add("rd-title");
		var back = document.createElement("button");
		back.className = "toolbutton rd-back";
		back.setAttribute("aria-label", stop.getAttribute("title") || "Back");
		back.title = stop.getAttribute("title") || "Back";
		back.addEventListener("click", function () { stop.click(); });
		var divider = document.createElement("span");
		divider.className = "rd-divider";
		var name = document.createElement("span");
		name.className = "rd-name";
		name.textContent = document.title.replace(/\s*Activity\s*$/, "");
		bar.insertBefore(divider, bar.firstChild);
		bar.insertBefore(back, bar.firstChild);
		var icon = document.getElementById("activity-button");
		bar.insertBefore(name, icon ? icon.nextSibling : divider.nextSibling);
	}
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", build);
	} else {
		build();
	}
})();
