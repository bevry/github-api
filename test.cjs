'use strict'
/** @type {typeof import("./compiled-types/test.d.ts") } */
module.exports = require('editions').requirePackage(
	__dirname,
	require,
	'test.js'
)
