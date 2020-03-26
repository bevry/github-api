'use strict'

const { fetch, redact } = require('./')

// fetch the url
const githubAuthQueryString = fetch({
	GITHUB_CLIENT_ID: 'value',
	GITHUB_CLIENT_SECRET: 'value',
})
const githubURL = `https://api.github.com/user?${githubAuthQueryString}`
console.log(githubURL)

// now redact it
const githubURLRedacted = redact(githubURL)
console.log(githubURLRedacted)
