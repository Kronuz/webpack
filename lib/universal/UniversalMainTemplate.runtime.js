/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Germán Méndez Bravo (Kronuz)

	This comes mainly from webpack/lib/web/JsonpMainTemplate.runtime.js
	and partially from webpack/lib/node/NodeMainTemplate.runtime.js
	[https://github.com/webpack/webpack/tree/v4.10.2]
*/
/*globals hotAddUpdateChunk parentHotUpdateCallback document XMLHttpRequest __require $require$ $hotChunkFilename$ $hotMainFilename$ $crossOriginLoading$ */
module.exports = function() {
	// eslint-disable-next-line no-unused-vars
	function webpackHotUpdateCallback(chunkId, moreModules) {
		hotAddUpdateChunk(chunkId, moreModules);
		if (parentHotUpdateCallback) parentHotUpdateCallback(chunkId, moreModules);
	} //$semicolon

	// eslint-disable-next-line no-unused-vars
	function hotDownloadUpdateChunk(chunkId) {
		var requestPath =
			"/" + $require$.p.replace(/^\/|\/$/g, "") + "/" + $hotChunkFilename$;
		if (typeof window === "undefined") {
			var chunk = __require(requestPath);
			hotAddUpdateChunk(chunk.id, chunk.modules);
		} else {
			var head = document.getElementsByTagName("head")[0];
			var script = document.createElement("script");
			script.charset = "utf-8";
			script.src = requestPath;
			$crossOriginLoading$;
			head.appendChild(script);
		}
	}

	// eslint-disable-next-line no-unused-vars
	function hotDownloadManifest(requestTimeout) {
		var requestPath =
			"/" + $require$.p.replace(/^\/|\/$/g, "") + "/" + $hotMainFilename$;
		if (typeof window === "undefined") {
			try {
				var update = __require(requestPath);
			} catch (e) {
				return Promise.resolve();
			}
			return Promise.resolve(update);
		} else {
			requestTimeout = requestTimeout || 10000;
			return new Promise(function(resolve, reject) {
				if (typeof XMLHttpRequest === "undefined") {
					return reject(new Error("No browser support"));
				}
				try {
					var request = new XMLHttpRequest();
					request.open("GET", requestPath, true);
					request.timeout = requestTimeout;
					request.send(null);
				} catch (err) {
					return reject(err);
				}
				request.onreadystatechange = function() {
					if (request.readyState !== 4) return;
					if (request.status === 0) {
						// timeout
						reject(
							new Error("Manifest request to " + requestPath + " timed out.")
						);
					} else if (request.status === 404) {
						// no update available
						resolve();
					} else if (request.status !== 200 && request.status !== 304) {
						// other failure
						reject(
							new Error("Manifest request to " + requestPath + " failed.")
						);
					} else {
						// success
						try {
							var update = JSON.parse(request.responseText);
						} catch (e) {
							reject(e);
							return;
						}
						resolve(update);
					}
				};
			});
		}
	}
};
