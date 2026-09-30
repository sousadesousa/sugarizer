requirejs.config({
  baseUrl: "lib",
  shim: {},
  // Load templates with XHR even when Electron exposes Node.js to the page
  config: {
    text: {
      env: "xhr"
    }
  },
  paths: {
    activity: "../js",
    mustache: '../lib/mustache'
  }
});

requirejs(["activity/activity"]);
