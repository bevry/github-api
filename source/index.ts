import { StrictUnion } from 'simplytyped'

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

/**
 * Fetch the GitHub Auth Query String.
 * @param credentials If no credentials were passed, then the environment variables are used if they exist.
 * @returns The query string that you should append to your github API request url. Will be an empty string if no valid credentials were provided.
 * @example If your credentials are an arbitary object, then typecast like so:
 * ``` typescript
 * import {fetch, GitHubCredentials} from 'githubauthquerystring'
 * fetchGithubAuthQueryString({} as GitHubCredentials)
 * ```
 */
export function fetch(
	credentials: GitHubCredentials = process && (process.env as GitHubCredentials)
) {
	if (credentials.GITHUB_ACCESS_TOKEN) {
		return `access_token=${credentials.GITHUB_ACCESS_TOKEN}`
	} else if (credentials.GITHUB_CLIENT_ID && credentials.GITHUB_CLIENT_SECRET) {
		return `client_id=${credentials.GITHUB_CLIENT_ID}&client_secret=${credentials.GITHUB_CLIENT_SECRET}`
	} else {
		return ''
	}
}

/**
 * Redact any github credentials from a string.
 * @param value The string to redact credentials from.
 * @return The string with the credentials redacted
 */
export function redact(value: string) {
	return value.replace(
		/(&?)(access_token|client_id|client_secret)=\w+/gi,
		'$1$2=REDACTED'
	)
}

/** GitHub auth query string for the initial environment variables */
export default fetch()
