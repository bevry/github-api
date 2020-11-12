import type { StrictUnion } from 'simplytyped'

/** If the variable `GITHUB_API_URL` or `GITHUB_API` exists, use that, otherwise use the value `https://api.github.com`. */
type GitHubApiUrl = StrictUnion<
	| {
			/** https://docs.github.com/en/free-pro-team@latest/actions/reference/environment-variables#default-environment-variables */
			GITHUB_API_URL: string
	  }
	| {
			/** https://github.com/search?l=JavaScript&q=GITHUB_API&type=Code */
			GITHUB_API: string
	  }
>

/**
 * If the variable `GITHUB_ACCESS_TOKEN` or `GITHUB_TOKEN` exists, use that according to:
 * https://developer.github.com/v3/#oauth2-token-sent-as-a-parameter
 */
type GitHubToken = StrictUnion<
	| {
			/** https://github.com/search?q=GITHUB_ACCESS_TOKEN&type=code */
			GITHUB_ACCESS_TOKEN: string
	  }
	| {
			/** https://docs.github.com/en/free-pro-team@latest/actions/reference/authentication-in-a-workflow#about-the-github_token-secret */
			GITHUB_TOKEN: string
	  }
>

/**
 * If the variables `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` exist, use that according to:
 * https://developer.github.com/v3/#oauth2-keysecret
 */
interface GitHubClient {
	GITHUB_CLIENT_ID: string
	GITHUB_CLIENT_SECRET: string
}

/**
 * Provide `GITHUB_ACCESS_TOKEN` or `GITHUB_TOKEN`,
 * or a combination of `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`,
 * optionally with `GITHUB_ACCESS_TOKEN` or `GITHUB_TOKEN`.
 * https://developer.github.com/v3/#authentication
 */
export type GitHubCredentials = StrictUnion<GitHubToken | GitHubClient> &
	Partial<GitHubApiUrl>

/**
 * Check whether or not sufficient GitHub credentials were supplied.
 * @returns `true` if valid
 * @throws if invalid
 */
export function validate(credentials: GitHubCredentials) {
	const accessToken = getAccessToken(credentials)
	if (
		accessToken ||
		(credentials.GITHUB_CLIENT_ID && credentials.GITHUB_CLIENT_SECRET)
	) {
		return true
	} else {
		throw new Error(
			'missing github credentials; provide `GITHUB_ACCESS_TOKEN` or `GITHUB_TOKEN`, or a combination of `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`'
		)
	}
}

/**
 * Get the desired GitHub Access Token from the credentials.
 * You probably want {@link getURL} instead.
 */
export function getAccessToken(credentials: GitHubCredentials): string | null {
	return credentials.GITHUB_ACCESS_TOKEN || credentials.GITHUB_TOKEN || null
}

/**
 * Get the GitHub Authorization Search Params.
 * You probably want {@link getURL} instead.
 * @param credentials The params to use for the authorization variables.
 * @param params If you wish to set the params on an existing URLSearchParams instance, then provide it here.
 * @returns The search params that you should append to your github API request url.
 * @throws If no valid GitHub Authorization was provided.
 */
export function getSearchParams(
	credentials: GitHubCredentials,
	params = new URLSearchParams()
) {
	const accessToken = getAccessToken(credentials)
	if (accessToken) {
		params.set('access_token', accessToken)
	} else if (credentials.GITHUB_CLIENT_ID && credentials.GITHUB_CLIENT_SECRET) {
		params.set('client_id', credentials.GITHUB_CLIENT_ID)
		params.set('client_secret', credentials.GITHUB_CLIENT_SECRET)
	} else {
		// throw with detail errors
		validate(credentials)
		// if that doesn't throw, then fallback to this
		throw new Error('invalid github credentials')
	}
	return params
}

/**
 * Get the GitHub Authorization as a Query String.
 * You probably want {@link getURL} instead.
 */
export function getQueryString(credentials: GitHubCredentials) {
	return getSearchParams(credentials).toString()
}

/**
 * Get the GitHub Authorization Header.
 * Use as the `Authorization` header within {@link fetch} calls.
 * You probably want {@link getHeaders} instead.
 */
export function getAuthHeader(credentials: GitHubCredentials) {
	const accessToken = getAccessToken(credentials)
	if (accessToken) {
		return `token ${accessToken}`
	} else if (credentials.GITHUB_CLIENT_ID && credentials.GITHUB_CLIENT_SECRET) {
		return `Basic ${credentials.GITHUB_CLIENT_ID}:${credentials.GITHUB_CLIENT_SECRET}`
	} else {
		throw new Error('missing github credentials for authorization header')
	}
}

/**
 * Get the headers to attach to the request to the GitHub API.
 * Use as the headers object within {@link fetch} calls.
 * Make sure to use with {@link getApiUrl} to make sure you are using the desired hostname.
 */
export function getHeaders(credentials: GitHubCredentials) {
	return {
		Accept: 'application/vnd.github.v3+json',
		Authorization: getAuthHeader(credentials),
	}
}

/**
 * Get the desired Github API URL string.
 * As this does not include any credentials, use with {@link getAuthHeader} to authorize correctly.
 * Otherwise use {@link getURL} to get a credentialed URL.
 */
export function getApiUrl(credentials: GitHubCredentials) {
	return (
		credentials.GITHUB_API_URL ||
		credentials.GITHUB_API ||
		'https://api.github.com'
	)
}

/**
 * Get the credentialed GitHub API URL instance.
 * Uses {@link getApiUrl} to fill the hostname, and uses {@link getSearchParams} to fill the credentials.
 */
export function getURL(
	credentials: GitHubCredentials,
	props?: { pathname?: string; searchParams?: URLSearchParams }
): URL {
	// fetch url
	const url = new URL(getApiUrl(credentials))
	// apply params
	getSearchParams(credentials, url.searchParams)
	if (props?.searchParams)
		props.searchParams.forEach((value, key) => url.searchParams.set(key, value))
	// apply pathname via append, as otherwise urls like `https://bevry.me/api/github` will not work
	if (props?.pathname) url.pathname += props.pathname
	// return
	return url
}

/**
 * Get the credentialed GitHub API URL string from {@link getURL}.
 */
export function getUrl(
	credentials: GitHubCredentials,
	props?: { pathname?: string; searchParams?: URLSearchParams }
) {
	return getURL(credentials, props).toString()
}

/**
 * Redact any GitHub Credentials from a URL string.
 * @param value The string to redact credentials from.
 * @returns The string with the credentials redacted.
 */
export function redactSearchParams(value: string) {
	return value.replace(
		/(&?)(access_token|client_id|client_secret)=\w+/gi,
		'$1$2=REDACTED'
	)
}
