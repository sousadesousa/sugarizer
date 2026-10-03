const fs = require("fs");

const axios = {
	get: function (url) {
		var content;
		if (url)
			content = fs.readFileSync(url.replace("file://", ""), {
				encoding: "utf8",
				flag: "r",
			});
		return {
			then: function (callback) {
				var result = {};
				result.data = content;
				callback(result);
				return {
					catch: function () {
						// no rejection in this mock
					},
				};
			},
		};
	},
};

module.exports = axios;
