// external
import type { StrictUnion } from 'simplytyped'
import _fetch from 'node-fetch'

// defaults
import { env } from 'process'
const envCredentials = env as GitHubCredentials

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
			/** https://docs.github.com/en/actions/reference/authentication-in-a-workflow#about-the-github_token-secret */
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
 * You probably want to use {@link fetch} directly, instead of going through this method.
 */
export function getAccessToken(credentials: GitHubCredentials): string | null {
	return credentials.GITHUB_ACCESS_TOKEN || credentials.GITHUB_TOKEN || null
}

/**
 * Get the GitHub Authorization Search Params.
 * You probably want to use {@link fetch} directly, instead of going through this method.
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
 * Remove any GitHub Credentials from a URL Search Params instance.
 * You probably want to use {@link fetch} directly, instead of going through this method.
 */
export function removeSearchParams(params = new URLSearchParams()) {
	params.delete('access_token')
	params.delete('client_id')
	params.delete('client_secret')
	return params
}

/**
 * Redact any GitHub Credentials from a URL string.
 * You probably want to use {@link fetch} directly, instead of going through this method.
 * @param value The string to redact credentials from.
 * @returns The string with the credentials redacted.
 */
export function redactSearchParams(value: string) {
	return value.replace(
		/(&?)(access_token|client_id|client_secret)=\w+/gi,
		'$1$2=REDACTED'
	)
}

/**
 * Get the GitHub Authorization as a Query String.
 * You probably want to use {@link getURL} directly, instead of going through this method.
 */
export function getQueryString(credentials: GitHubCredentials) {
	return getSearchParams(credentials).toString()
}

/**
 * Get the GitHub Authorization Header.
 * Use as the `Authorization` header within {@link fetch} calls.
 * You probably want to use {@link getHeaders} or {@link fetch} directly, instead of going through this method.
 * @throws If no valid GitHub Authorization was provided.
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
 * You probably want to use {@link fetch} directly, instead of going through this method.
 */
export function getHeaders(
	credentials: GitHubCredentials,
	headers: Record<string, string> = {}
) {
	return {
		Accept: 'application/vnd.github.v3+json',
		Authorization: getAuthHeader(credentials),
		...headers,
	}
}

/**
 * Remove any GitHub Credentials from a Headers instance.
 * You probably want to use {@link fetch} directly, instead of going through this method.
 */
export function removeHeaders(headers: Record<string, string>) {
	// @ts-ignore
	delete headers.Authorization
	return headers
}

/**
 * Get the desired Github API URL, using {@link removeSearchParams}.to ensure there are no credentials.
 * As this URL does not include credentials, use with {@link getAuthHeader} to authorize correctly.
 * Otherwise use {@link getCredentialedURL} to get a credentialed URL.
 * You probably want to use {@link fetch} directly, instead of going through this method.
 * If the credentials property is nullish, then the environment variables are attempted.
 */
export function getURL(
	props: {
		credentials?: GitHubCredentials
		url?: string
		pathname?: string
		searchParams?: URLSearchParams | Record<string, string>
	} = {}
) {
	// default credentials
	if (props.credentials == null)
		props = { ...props, credentials: envCredentials }

	// fetch url
	const url = new URL(
		props.url ||
			props.credentials!.GITHUB_API_URL ||
			props.credentials!.GITHUB_API ||
			'https://api.github.com'
	)

	// add user params
	if (props?.searchParams) {
		if (props.searchParams instanceof URLSearchParams) {
			props.searchParams.forEach((value, key) =>
				url.searchParams.set(key, value)
			)
		} else {
			Object.entries(props.searchParams).forEach(([key, value]) =>
				url.searchParams.set(key, value)
			)
		}
	}

	// ensure that there are no credentials in the URL
	removeSearchParams(url.searchParams)

	// add user pathname
	// the convoluted way of doing this is to make sure that with or without / is valid
	// as the GITHUB_API hostname may be something like `https://bevry.me/api/github`
	if (props?.pathname) {
		url.pathname = [
			url.pathname.replace(/^[/]+|[/]+$/, ''),
			props.pathname.replace(/^[/]+|[/]+$/, ''),
		]
			.filter((i) => i)
			.join('/')
	}

	// return
	return url
}

/**
 * Get the credentialed GitHub API URL instance.
 * Uses {@link getURL} to get the URL, then uses {@link getSearchParams} to add the credentials.
 * You probably want to use {@link fetch} directly, instead of going through this method.
 * If the credentials property is nullish, then the environment variables are attempted.
 */
export function getCredentialedURL(
	props: {
		credentials?: GitHubCredentials
		url?: string
		pathname?: string
		searchParams?: URLSearchParams | Record<string, string>
	} = {}
): URL {
	// default credentials
	if (props.credentials == null)
		props = { ...props, credentials: envCredentials }

	// fetch url
	const url = getURL(props)

	// add auth params
	getSearchParams(props.credentials!, url.searchParams)

	// return
	return url
}

/**
 * Fetches a GitHub API response via secure headers authorization.
 * Uses {@link getURL} to get the URL, then uses {@link getHeaders} to add the credentials.
 * This is probably the method you want to use.
 * If the credentials property is nullish, then the environment variables are attempted.
 */
export function fetch(
	props: {
		credentials?: GitHubCredentials
		url?: string
		pathname?: string
		searchParams?: URLSearchParams | Record<string, string>
		headers?: Record<string, string>
	} = {}
) {
	// default credentials
	if (props.credentials == null)
		props = { ...props, credentials: envCredentials }

	// prep
	const url = getURL(props)
	const opts = {
		headers: getHeaders(props.credentials!, props.headers),
	}

	// fetch and return
	return _fetch(url, opts)
}
