/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Germán Méndez Bravo (Kronuz)

	This comes mainly from ../web/JsonpTemplatePlugin.js
	[https://github.com/webpack/webpack/tree/v4.10.2]
*/
"use strict";

const UniversalMainTemplatePlugin = require("./UniversalMainTemplatePlugin");
const UniversalChunkTemplatePlugin = require("./UniversalChunkTemplatePlugin");
const JsonpHotUpdateChunkTemplatePlugin = require("../web/JsonpHotUpdateChunkTemplatePlugin");

class UniversalTemplatePlugin {
	apply(compiler) {
		const options = {};
		options.name = compiler.options.name;
		compiler.hooks.thisCompilation.tap(
			"UniversalTemplatePlugin",
			compilation => {
				new UniversalMainTemplatePlugin(options).apply(
					compilation.mainTemplate
				);
				new UniversalChunkTemplatePlugin(options).apply(
					compilation.chunkTemplate
				);
				new JsonpHotUpdateChunkTemplatePlugin().apply(
					compilation.hotUpdateChunkTemplate
				);
			}
		);
	}
}

module.exports = UniversalTemplatePlugin;
