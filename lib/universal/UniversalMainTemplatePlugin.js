/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Germán Méndez Bravo (Kronuz)

	This comes mainly from ../web/JsonpMainTemplatePlugin.js
	and partially from ../node/NodeMainTemplatePlugin.js
	[https://github.com/webpack/webpack/tree/v4.10.2]
*/
"use strict";

const Template = require("../Template");
const { ConcatSource } = require("webpack-sources");

class UniversalMainTemplatePlugin {
	constructor(options) {
		this.name = options.name;
		this.withRuntime = false;
	}

	apply(mainTemplate) {
		const withRuntime = this.withRuntime;
		mainTemplate.hooks.localVars.tap(
			"UniversalMainTemplatePlugin",
			(source, chunk, hash) => {
				const dependencies = new Set();
				for (const chunkModule of chunk.modulesIterable) {
					if (chunkModule.issuer && chunkModule.issuer.dependencies) {
						const dep = chunkModule.issuer.dependencies[0];
						if (dep) {
							const sourceModule = dep.module;
							if (
								sourceModule &&
								sourceModule.external &&
								sourceModule.externalType
							) {
								dependencies.add(sourceModule.request);
							}
						}
					}
				}
				const entries = [chunk.entryModule].filter(Boolean).map(m =>
					[m.id].concat(
						Array.from(chunk.groupsIterable)[0]
							.chunks.filter(c => c !== chunk)
							.map(c => c.id)
					)
				);

				const chunkMaps = chunk.getChildIdsByOrdersMap();
				return Template.asString([
					source,
					"",
					"var webpackUniversalOptions = {};",
					"",
					"// object to store loaded and loading Javascript chunks",
					"// undefined = chunk not loaded, null = chunk preloaded/prefetched",
					"// Promise = chunk loading, 0 = chunk loaded",
					"var installedChunks = {",
					Template.indent(
						chunk.ids.map(id => `${JSON.stringify(id)}: 0`).join(",\n")
					),
					"};",
					"",
					"// script path function",
					"function scriptSrc(chunkId) {",
					Template.indent([
						`return ${mainTemplate.getAssetPathSrc(
							JSON.stringify(mainTemplate.outputOptions.chunkFilename),
							hash,
							chunk,
							"chunkId",
							"javascript"
						)}`
					]),
					"}",
					"",
					"// deferred chunks for splitChunks",
					"var deferredModules = [",
					Template.indent([entries.map(e => JSON.stringify(e)).join(", ")]),
					"];",
					"",
					"// chunk preloading for javascript",
					`var chunkPreloadMap = ${JSON.stringify(
						chunkMaps.preload || {},
						null,
						"\t"
					)}`,
					"",
					"// chunk prefetching for javascript",
					`var chunkPrefetchMap = ${JSON.stringify(
						chunkMaps.prefetch || {},
						null,
						"\t"
					)}`,
					"",
					"// object to store dependencies",
					"var dependencies = [",
					Template.indent(
						Array.from(dependencies)
							.map(request => JSON.stringify(request))
							.join(",\n")
					),
					"];"
				]);
			}
		);
		mainTemplate.hooks.requireExtensions.tap(
			"UniversalMainTemplatePlugin",
			(source, chunk, hash) => {
				return Template.asString([
					source,
					"",
					"// chunk path",
					`${mainTemplate.requireFn}.cp = ${JSON.stringify(
						mainTemplate.getAssetPath(
							mainTemplate.outputOptions.publicPath +
								mainTemplate.outputOptions.chunkFilename,
							{ chunk }
						)
					)}`
				]);
			}
		);
		mainTemplate.hooks.requireEnsure.tap(
			"UniversalMainTemplatePlugin",
			(source, chunk, hash) => {
				return Template.asString([
					source,
					`promises.push(${mainTemplate.requireFn}.eu(chunkId));`,
					""
				]);
			}
		);
		mainTemplate.hooks.beforeStartup.tap(
			"UniversalMainTemplatePlugin",
			(source, chunk, hash) => {
				return Template.asString([
					source,
					"",
					"Object.assign(webpackUniversalOptions, {",
					Template.indent(
						[
							"u: __universal__",
							`r: ${mainTemplate.requireFn}`,
							"m: modules",
							"s: scriptSrc",
							"i: installedChunks",
							"sc: cssSrc",
							"ic: installedCssChunks",
							"cc: cssChunks",
							"el: deferredModules",
							"pl: chunkPreloadMap",
							"pf: chunkPrefetchMap",
							"dp: dependencies"
						].join(",\n")
					),
					"});"
				]);
			}
		);
		mainTemplate.hooks.startup.tap(
			"UniversalMainTemplatePlugin",
			(source, chunk, hash) => {
				return Template.asString([
					"",
					"global.webpackUniversal = global.webpackUniversal || [];",
					"return global.webpackUniversal.push(webpackUniversalOptions);"
				]);
			}
		);
		mainTemplate.hooks.renderWithEntry.tap(
			"UniversalMainTemplatePlugin",
			(source, chunk) => {
				const runtimeSource = withRuntime
					? Template.asString([
							"var __debug_runtime__ = false;",
							Template.getFunctionContent(require("./Universal.runtime.js"))
					  ])
					: "";

				const universalName =
					"webpackUniversal" +
					Template.toIdentifier(this.name)
						.replace(/\b\w/g, l => l.toUpperCase())
						.replace(/\//g, "");
				return new ConcatSource(
					'if (typeof window !== "undefined") window.global = window.global || window;\n',
					"(function(__universal__) {\n",
					runtimeSource,
					"var __module__exports =\n",
					source,
					`;\nif (typeof module !== "undefined") module.exports = __module__exports`,
					`;\n})(global.${universalName} = global.${universalName} || {})`
				);
			}
		);
		mainTemplate.hooks.hotBootstrap.tap(
			"UniversalMainTemplatePlugin",
			(source, chunk, hash) => {
				const hotUpdateChunkFilename =
					mainTemplate.outputOptions.hotUpdateChunkFilename;
				const hotUpdateMainFilename =
					mainTemplate.outputOptions.hotUpdateMainFilename;
				const crossOriginLoading =
					mainTemplate.outputOptions.crossOriginLoading;
				const hotUpdateFunction = mainTemplate.outputOptions.hotUpdateFunction;
				const currentHotUpdateChunkFilename = mainTemplate.getAssetPath(
					JSON.stringify(hotUpdateChunkFilename),
					{
						hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
						hashWithLength: length =>
							`" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`,
						chunk: {
							id: '" + chunkId + "'
						}
					}
				);
				const currentHotUpdateMainFilename = mainTemplate.getAssetPath(
					JSON.stringify(hotUpdateMainFilename),
					{
						hash: `" + ${mainTemplate.renderCurrentHashCode(hash)} + "`,
						hashWithLength: length =>
							`" + ${mainTemplate.renderCurrentHashCode(hash, length)} + "`
					}
				);
				const runtimeSource = Template.getFunctionContent(
					require("./UniversalMainTemplate.runtime.js")
				)
					.replace(/\/\/\$semicolon/g, ";")
					.replace(/\$require\$/g, mainTemplate.requireFn)
					.replace(
						/\$crossOriginLoading\$/g,
						crossOriginLoading
							? `script.crossOrigin = ${JSON.stringify(crossOriginLoading)}`
							: ""
					)
					.replace(/\$hotMainFilename\$/g, currentHotUpdateMainFilename)
					.replace(/\$hotChunkFilename\$/g, currentHotUpdateChunkFilename)
					.replace(/\$hash\$/g, JSON.stringify(hash));
				return `${source}
function hotDisposeChunk(chunkId) {
	delete installedChunks[chunkId];
}
var parentHotUpdateCallback = global[${JSON.stringify(hotUpdateFunction)}];
global[${JSON.stringify(hotUpdateFunction)}] = ${runtimeSource}
(global.__webpack_hmr = (global.__webpack_hmr || {}))['${this.name}'] = ${
					mainTemplate.requireFn
				}`;
			}
		);
		mainTemplate.hooks.hash.tap("UniversalMainTemplatePlugin", hash => {
			hash.update("universal");
			hash.update("1");
			hash.update(this.name);
			hash.update(`${mainTemplate.outputOptions.chunkFilename}`);
			hash.update(`${mainTemplate.outputOptions.hotUpdateFunction}`);
		});
	}
}
module.exports = UniversalMainTemplatePlugin;
