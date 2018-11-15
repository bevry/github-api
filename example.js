'use strict'

const { fetchGithubAuthQueryString, redactGithubAuthQueryString } = require('./')

// fetch the url
const githubAuthQueryString = fetchGithubAuthQueryString({
	GITHUB_CLIENT_ID: 'value',
	GITHUB_CLIENT_SECRET: 'value'
})
const githubApiURL = `https://api.github.com/some/call?${githubAuthQueryString}`
console.log(githubApiURL)

// now redact it
const githubApiRedactedURL = redactGithubAuthQueryString(githubApiURL)
console.log(githubApiRedactedURL)
