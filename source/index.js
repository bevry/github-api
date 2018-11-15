'use strict'

/**
 * Fetch the GitHub Auth Query String.
 * If the variable GITHUB_ACCESS_TOKEN exists, use that according to:
 * https://developer.github.com/v3/#oauth2-token-sent-as-a-parameter
 * If the variables GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET exist, use that according to:
 * https://developer.github.com/v3/#oauth2-keysecret
 * If opts is not provided, the environment variables are used if they exist.
 * If the values are invalid, then an empty string will be returned.
 * @param {Object} [opts]
 * @param {string} [opts.GITHUB_ACCESS_TOKEN]
 * @param {string} [opts.GITHUB_CLIENT_ID]
 * @param {string} [opts.GITHUB_CLIENT_SECRET]
 * @returns {string} the query string that you should append to your github API request url
 */
function fetchGithubAuthQueryString (opts) {
	// https://developer.github.com/v3/#authentication
	const { GITHUB_ACCESS_TOKEN, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = opts || process.env
	if (GITHUB_ACCESS_TOKEN) {
		return `access_token=${GITHUB_ACCESS_TOKEN}`
	}
	else if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
		return `client_id=${GITHUB_CLIENT_ID}&client_secret=${GITHUB_CLIENT_SECRET}`
	}
	else {
		return ''
	}
}

/**
 * Redact the credentials from a string.
 * @param {string} value
 * @returns {string} the value with credentials redacted
 */
function redactGithubAuthQueryString (value) {
	return value.replace(/(&?)(access_token|client_id|client_secret)=\w+/gi, '$1$2=REDACTED')
}

module.exports.fetch = fetchGithubAuthQueryString
module.exports.fetchGithubAuthQueryString = fetchGithubAuthQueryString

module.exports.redact = redactGithubAuthQueryString
module.exports.redactGithubAuthQueryString = redactGithubAuthQueryString
