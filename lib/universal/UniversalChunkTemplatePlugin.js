/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Authors Tobias Koppers @sokra
	        Germán Méndez Bravo (Kronuz)

	This comes mainly from webpack/lib/web/JsonpChunkTemplatePlugin.js
	and partially from webpack/lib/node/NodeNodeTemplatePlugin.js
	[https://github.com/webpack/webpack/tree/v4.10.2]
*/
"use strict";

const Template = require("../Template");
const { ConcatSource } = require("webpack-sources");

class UniversalChunkTemplatePlugin {
	constructor(options) {
		this.name = options.name;
	}

	apply(chunkTemplate) {
		chunkTemplate.hooks.render.tap(
			"UniversalChunkTemplatePlugin",
			(modules, chunk) => {
				const source = new ConcatSource();
				source.add("{");
				source.add(`\n\ti: ${JSON.stringify(chunk.ids)},`);
				source.add("\n\tm: ");
				source.add(modules);
				const entries = [chunk.entryModule].filter(Boolean).map(m =>
					[m.id].concat(
						Array.from(chunk.groupsIterable)[0]
							.chunks.filter(c => c !== chunk)
							.map(c => c.id)
					)
				);
				if (entries.length > 0) {
					source.add(",");
					source.add(`\n\te: ${JSON.stringify(entries)}`);
				}
				source.add("\n}");
				const universalName =
					"webpackUniversal" +
					Template.toIdentifier(this.name)
						.replace(/\b\w/g, l => l.toUpperCase())
						.replace(/\//g, "");
				return new ConcatSource(
					'if (typeof window !== "undefined") window.global = window.global || window;\n',
					"(function(__universal__) {\n",
					"var __module__exports =\n",
					source,
					";\n__universal__.chunks = __universal__.chunks || []",
					";\n__universal__.chunks.push(__module__exports)",
					';\nif (typeof module !== "undefined") module.exports = __module__exports',
					`;\n})(global.${universalName} = global.${universalName} || {})`
				);
			}
		);
		chunkTemplate.hooks.hash.tap("UniversalChunkTemplatePlugin", hash => {
			hash.update("UniversalChunkTemplatePlugin");
			hash.update("1");
			hash.update(this.name);
		});
	}
}
module.exports = UniversalChunkTemplatePlugin;
