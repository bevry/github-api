'use strict'
/** @type {typeof import("./compiled-types/index.d.ts") } */
module.exports = require('editions').requirePackage(
	__dirname,
	require,
	'index.js'
)
