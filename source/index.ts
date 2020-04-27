import type { StrictUnion } from 'simplytyped'

/**
 * If the variable `GITHUB_ACCESS_TOKEN` exists, use that according to:
 * https://developer.github.com/v3/#oauth2-token-sent-as-a-parameter
 */
interface GitHubToken {
	GITHUB_ACCESS_TOKEN: string
}

/**
 * If the variables `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` exist, use that according to:
 * https://developer.github.com/v3/#oauth2-keysecret
 */
interface GitHubClient {
	GITHUB_CLIENT_ID: string
	GITHUB_CLIENT_SECRET: string
}

/**
 * Provide either `GITHUB_ACCESS_TOKEN` or a combination of `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
 * https://developer.github.com/v3/#authentication
 */
export type GitHubCredentials = StrictUnion<GitHubToken | GitHubClient>

/** GitHub credentialed environment */
export type GitHubEnv = NodeJS.ProcessEnv & GitHubCredentials

/**
 * Fetch the GitHub Auth Query String.
 * @param credentials If no credentials were passed, then the environment variables are used if they exist.
 * @returns The query string that you should append to your github API request url. Will be an empty string if no valid credentials were provided.
 */
export function getParams(
	credentials: GitHubCredentials = process?.env as GitHubEnv
) {
	if (credentials.GITHUB_ACCESS_TOKEN) {
		return `access_token=${credentials.GITHUB_ACCESS_TOKEN}`
	} else if (credentials.GITHUB_CLIENT_ID && credentials.GITHUB_CLIENT_SECRET) {
		return `client_id=${credentials.GITHUB_CLIENT_ID}&client_secret=${credentials.GITHUB_CLIENT_SECRET}`
	} else {
		throw new Error('missing github credentials for query string')
	}
}

// Aliases
export const githubQueryString = getParams
export const fetch = getParams
export default getParams

/**
 * Fetch the GitHub Authorization Header.
 * @param credentials If no credentials were passed, then the environment variables are used if they exist.
 * @returns The Authorization header to attach to the request to the GitHub request.
 */
export function getAuthHeader(
	credentials: GitHubCredentials = process?.env as GitHubEnv
) {
	if (credentials.GITHUB_ACCESS_TOKEN) {
		return `token ${credentials.GITHUB_ACCESS_TOKEN}`
	} else if (credentials.GITHUB_CLIENT_ID && credentials.GITHUB_CLIENT_SECRET) {
		return `Basic ${credentials.GITHUB_CLIENT_ID}:${credentials.GITHUB_CLIENT_SECRET}`
	} else {
		throw new Error('missing github credentials for authorization header')
	}
}

// Aliases
export const githubAuthorizationHeader = getAuthHeader

/**
 * Fetch the headers to attach to the request to the GitHub API
 * @param credentials If no credentials were passed, then the environment variables are used if they exist.
 * @returns The headers to attach to the request to the GitHub request.
 */
export function getHeaders(
	credentials: GitHubCredentials = process?.env as GitHubEnv
) {
	return {
		Accept: 'application/vnd.github.v3+json',
		Authorization: getAuthHeader(credentials),
	}
}

/**
 * Redact any github credentials from a string.
 * @param value The string to redact credentials from.
 * @returns The string with the credentials redacted
 */
export function redactParams(value: string) {
	return value.replace(
		/(&?)(access_token|client_id|client_secret)=\w+/gi,
		'$1$2=REDACTED'
	)
}

// Alias
export const redact = redactParams
