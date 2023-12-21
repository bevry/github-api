// external
import type { StrictUnion } from 'simplytyped'
import wait from '@bevry/wait'
import PromisePool from 'native-promise-pool'
import { graphql as octokitGraphQL } from '@octokit/graphql'
import { load as parseYAML } from 'js-yaml'
import { append, flatten } from '@bevry/list'
import Errlop from 'errlop'
import arrangePackageData from 'arrange-package-json'
import Fellow, { FormatOptions as FellowFormatOptions } from 'fellow'
export { Fellow, PromisePool, Errlop }

// defaults
import { env } from 'process'
const envCredentials = env as GitHubCredentials

// helpers
async function fetchOk(url: string): Promise<boolean> {
	const resp = await fetch(url, { method: 'HEAD' })
	return resp.ok
}
async function fetchNotOk(url: string): Promise<boolean> {
	const ok = await fetchOk(url)
	return !ok
}

// ====================================
// Package.json

/** Package.json person fields that we use */
export interface PackagePerson {
	name?: string
	email?: string
	username?: string
	web?: string
}

/** Package.json fields that we use */
export interface PackageData {
	/** The title of the project, used for rendering the default prefix */
	title?: string
	/** The name of the project, used for rendering the default prefix if {@link PackageData.title} is not present. */
	name?: string

	/** The homepage URL of the project */
	homepage?: string
	/** The Repository URL of the project */
	repository?: string | { url?: string }

	/* Copyright Owners of the GitHub Repository */
	author?: string | PackagePerson
	/* Admins/Maintainers/Publishers of the GitHub Repository */
	maintainers?: Array<string | PackagePerson>
	/* Contributors of the GitHub Repository */
	contributors?: Array<string | PackagePerson>

	/* Initial financial backers of the GitHub Repository */
	funders?: Array<string | PackagePerson>
	/* Active financial backers of the GitHub Repository */
	sponsors?: Array<string | PackagePerson>
	/* Historical financial backers of the GitHub Repository */
	donors?: Array<string | PackagePerson>

	/** Badges configuration, see https://github.com/bevry/badges and https://github.com/bevry/projectz */
	badges?: {
		config?: {
			githubSponsorsUsername?: string
			thanksdevGithubUsername?: string
			opencollectiveUsername?: string
		}
	}

	/** Incorrect naming of author, will be adjusted during execution */
	authors?: string | PackagePerson | Array<string | PackagePerson>
}

/** Fetch the package data of a repository. */
export async function getPackageData(
	slug: string,
	fallback?: PackageData,
): Promise<PackageData> {
	const url = `http://raw.github.com/${slug}/master/package.json`
	const resp = await fetch(url, {})
	if (!resp.ok) {
		const error = new Error(`package.json not found for ${slug}`)
		if (!fallback) throw error
		console.warn(error.message)
		return fallback
	}
	try {
		const packageData: PackageData = await resp.json()
		return packageData
	} catch (err: any) {
		const error = new Errlop(`failed to parse package.json of ${slug}`, err)
		if (!fallback) throw error
		console.warn(error.message)
		return fallback
	}
}

export function getGitHubSlugFromUrl(url: string) {
	return url
		.trim()
		.replace(/\.git$/, '')
		.replace(/^.*github\.com[:/]/, '')
}

export function getGitHubSlugFromPackageData(
	pkg: Pick<PackageData, 'homepage' | 'repository'>,
) {
	let match = null
	if (typeof pkg.repository === 'string') {
		match = pkg.repository.match(/^(?:github:)?([^/:]+\/[^/:]+)$/)
	} else {
		let url = null
		if (pkg.repository && typeof pkg.repository.url === 'string') {
			url = pkg.repository && pkg.repository.url
		} else if (typeof pkg.homepage === 'string') {
			url = pkg.homepage
		} else {
			return null
		}
		match = url.match(/github\.com\/([^/:]+\/[^/:]+?)(?:\.git|\/)?$/)
	}
	return (match && match[1]) || null
}

// ====================================
// ThanksDev Types

export enum ThanksDevPlatform {
	GitHub = 'gh',
	GitLab = 'gl',
}
export type ThanksDevDonor = [
	platform: ThanksDevPlatform,
	username: string,
	/** Can be zero */
	cents: number,
]
export interface ThanksDevResponse {
	donors: Array<ThanksDevDonor>
	dependers: Array<ThanksDevDonor>
}
export interface ThanksDevBackers {
	sponsors: Array<Fellow>
	donors: Array<Fellow>
}

/** Get a Fellow of a ThanksDev member */
function getThanksDevProfile([
	platform,
	username,
	cents,
]: ThanksDevDonor): Fellow {
	return Fellow.ensure({
		thanksdevUrl: `https://thanks.dev/d/${platform}/${username}`,
	})
}

/** Fetch backers from the ThanksDev API */
export async function getBackersFromThanksDev(
	platform: ThanksDevPlatform,
	username: string,
	opts: BackerQueryOptions = {},
): Promise<ThanksDevBackers> {
	let sponsors: Array<ThanksDevDonor> = [],
		donors: Array<ThanksDevDonor> = []
	// monthly
	try {
		const url = `https://api.thanks.dev/v1/vip/dependee/${platform}/${username}?age=30` // 30 is average days in a month
		const resp = await fetch(url, {})
		const data: ThanksDevResponse = await resp.json()
		sponsors = data.donors.filter(
			([, , cents]) =>
				cents &&
				(!opts.sponsorCentsThreshold || cents >= opts.sponsorCentsThreshold),
		)
	} catch (err: any) {
		throw new Errlop(
			`Fetching ThanksDev sponsors failed for: ${platform}/${username}`,
			err,
		)
	}
	// yearly
	try {
		const url = `https://api.thanks.dev/v1/vip/dependee/${platform}/${username}`
		const resp = await fetch(url, {})
		const data: ThanksDevResponse = await resp.json()
		donors = data.donors.filter(
			([, , cents]) =>
				cents &&
				(!opts.donorCentsThreshold || cents >= opts.donorCentsThreshold),
		)
	} catch (err: any) {
		throw new Errlop(
			`Fetching ThanksDev donors failed for: ${platform}/${username}`,
			err,
		)
	}
	// combine
	return {
		sponsors: Fellow.add(sponsors.map(getThanksDevProfile)),
		donors: Fellow.add(donors.map(getThanksDevProfile)),
	}
}

export interface OpenCollectiveMember {
	MemberId: number
	createdAt: string
	type: 'USER' | 'ORGANIZATION'
	role: 'ADMIN' | 'HOST' | 'BACKER'
	isActive: boolean
	/** Dollars */
	totalAmountDonated: number
	currency: string
	lastTransactionAt: string
	/** Dollars */
	lastTransactionAmount: number
	profile: string
	name: string
	company: null | string
	description: null | string
	image: null | string
	email?: null
	twitter: null | string
	github: null | string
	website: null | string
}
export type OpenCollectiveResponse = Array<OpenCollectiveMember>
export interface OpenCollectiveBackers {
	sponsors: Array<Fellow>
	donors: Array<Fellow>
}

/** Return a date instance that is the last month */
function getLastMonth(now: Date = new Date()): Date {
	const date = new Date()
	date.setMonth(date.getMonth() - 1)
	return date
}
/** Is the date within the last month */
function isWithinLastMonth(
	when: Date | string,
	lastMonth: Date | number = getLastMonth(),
): boolean {
	if (lastMonth instanceof Date) lastMonth = lastMonth.getTime()
	if (typeof when === 'string') when = new Date(when)
	return when.getTime() >= lastMonth
}

/** Get a Fellow of an OpenCollective member */
function getOpenCollectiveProfile(member: OpenCollectiveMember): Fellow {
	return Fellow.ensure({
		opencollectiveProfile: member,
		description: member.description,
		githubUrl: member.github,
		name: member.name,
		email: member.email,
		opencollectiveUrl: member.profile,
		twitterUrl: member.twitter,
		websiteUrl: member.website,
	})
}

/** Fetch backers from the OpenCollective API */
export async function getBackersFromOpenCollective(
	username: string,
	opts: BackerQueryOptions = {},
): Promise<OpenCollectiveBackers> {
	try {
		const url = `https://opencollective.com/${username}/members.json`
		const resp = await fetch(url, {})
		const profiles: OpenCollectiveResponse = await resp.json()
		// remove invalid github urls, as they can get outdated perhaps, as opencollective returns https://github.com/mikeumu for @mikeumus which should be https://github.com/mikeumus
		for (const profile of profiles) {
			let github = profile.github
			if (github && (await fetchNotOk(github))) {
				const username = profile.profile.replace(/^.+\.com\//, '') // strip https://opencollective.com/
				github = `https://github.com/${username}`
				if (username && (await fetchOk(github))) {
					profile.github = github
				} else {
					profile.github = ''
				}
			}
		}
		const lastMonth = getLastMonth().getTime()
		const sponsors = profiles.filter(
			(member) =>
				member.role === 'BACKER' &&
				member.lastTransactionAmount &&
				(!opts.sponsorCentsThreshold ||
					member.lastTransactionAmount * 100 > opts.sponsorCentsThreshold) &&
				isWithinLastMonth(member.lastTransactionAt, lastMonth),
		)
		const donors = profiles.filter(
			(member) =>
				member.role === 'BACKER' &&
				member.totalAmountDonated &&
				(!opts.donorCentsThreshold ||
					member.totalAmountDonated * 100 > opts.donorCentsThreshold),
		)
		return {
			sponsors: Fellow.add(sponsors.map(getOpenCollectiveProfile)),
			donors: Fellow.add(donors.map(getOpenCollectiveProfile)),
		}
	} catch (err: any) {
		throw new Errlop(
			`Fetching OpenCollective sponsors and donors failed for: ${username}`,
			err,
		)
	}
}

// ====================================
// FUNDING.yml Types

/** A .github/FUNDING.yml response */
export interface FundingData {
	github?: string | Array<string>
	patreon?: string | Array<string>
	open_collective?: string | Array<string>
	ko_fi?: string | Array<string>
	liberapay?: string | Array<string>
	custom?: string | Array<string>
}

/** Fetch the funding data of a repository. */
async function getFundingData(
	slug: string,
	fallback?: FundingData,
): Promise<FundingData> {
	const url = `http://raw.github.com/${slug}/master/.github/FUNDING.yml`
	const resp = await fetch(url, {})
	if (!resp.ok) {
		const error = new Error(`.github/FUNDING.yml not found for ${slug}`)
		if (!fallback) throw error
		console.warn(error.message)
		return fallback
	}
	try {
		const fundingText = await resp.text()
		const fundingData: FundingData = parseYAML(fundingText)
		return fundingData
	} catch (err: any) {
		const error = new Errlop(
			`failed to fetch .github/FUNDING.yml of ${slug}`,
			err,
		)
		if (!fallback) throw error
		console.warn(error.message)
		return fallback
	}
}

// ====================================
// GitHub API Types

/** Options for queries. */
export interface QueryOptions {
	/** Set to non-zero if you wish to restrict how many requests are made at once. */
	concurrency?: number

	/** The {@link PromisePool} instance to handle the {@link QueryOptions.concurrency} if specified. */
	pool?: PromisePool<any>

	/** For REST and GraphQL APIs, the GitHub API Credentials */
	credentials?: GitHubCredentials

	/** For GraphQL API, fetch this result field */
	resultField?: string

	/** For GraphQL API, start results after this cursor. */
	afterCursor?: string

	/** For REST and GraphQL APIs, how much results to return per page. */
	size?: number

	/** For REST API, start results at this page. */
	page?: number

	/** For REST API, set to non-zero if you wish to restrict how many pages are fetched. */
	pages?: number

	/** For REST API, the URL to use on the fetch. */
	url?: string

	/** For REST API, the pathname to use on the fetch. */
	pathname?: string

	/** For REST API, the search/query params to use on the fetch. */
	searchParams?: URLSearchParams | Record<string, string>

	/** For REST API, the headers to use on the fetch. */
	headers?: Record<string, string>

	/** For REST API, the user agent to use on the fetch. */
	userAgent?: string

	/** For REST API, the method to use on the fetch. */
	method?: RequestInit['method']

	/** For REST API, the body to use on the fetch. */
	body?: RequestInit['body']
}

/** Export some types we consume, so that others can also use them. */
export interface BackerQueryOptions extends QueryOptions {
	/** The minimum amount of monthly cents to be considered a financial donor (only applies if we are aware of the financial amount). */
	sponsorCentsThreshold?: number
	/** The minimum amount of eternal cents to be considered a financial donor (only applies if we are aware of the financial amount). */
	donorCentsThreshold?: number
}

/** GitHub's response when an error occurs. */
export interface GitHubError {
	message?: string
	documentation_url?: string
	errors?: Array<
		| {
				type: string
				path: Array<string>
				locations: Array<{
					line: number
					column: number
				}>
				message: string
		  }
		| {
				resource: string
				field: string
				code: string
		  }
	>
}

/** If the variable `GITHUB_API_URL` or `GITHUB_API` exists, use that, otherwise use the value `https://api.github.com`. */
export type GitHubApiUrl = StrictUnion<
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
export type GitHubToken = StrictUnion<
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
export interface GitHubClient {
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

// ====================================
// GitHub API

export type GitHubGraphQLResponse<T> = StrictUnion<GitHubError | T>
export type GitHubRESTResponse<T> = StrictUnion<GitHubError | T>

export interface GitHubUserGraphQL {
	bio: string
	company: string
	email: string
	isHireable: boolean
	location: string
	login: string
	name: string
	url: string
	websiteUrl: string
}
export interface GitHubOrganizationGraphQL {
	description: string
	email: string
	location: string
	login: string
	name: string
	url: string
	websiteUrl: string
}

export interface GitHubProfileGraphQL {
	user?: GitHubUserGraphQL
	organization?: GitHubOrganizationGraphQL
}

export type GitHubSponsorGraphQL = GitHubUserGraphQL & GitHubOrganizationGraphQL
export interface GitHubSponsorsGraphQL {
	user: {
		sponsors: {
			pageInfo?: {
				hasNextPage: boolean
				endCursor: string
			}
			nodes: Array<GitHubSponsorGraphQL>
		}
	}
}

export interface GitHubCommitREST {
	sha: string
}

/**
 * GitHub's response to getting a user.
 * https://developer.github.com/v3/users/#get-a-single-user
 */
export interface GitHubProfileREST {
	login: string
	id: number
	node_id: string
	avatar_url: string
	gravatar_id: string
	url: string
	html_url: string
	followers_url: string
	following_url: string
	gists_url: string
	starred_url: string
	subscriptions_url: string
	organizations_url: string
	repos_url: string
	events_url: string
	received_events_url: string
	type: string
	site_admin: boolean
	name: string
	company: string
	blog: string
	location: string
	email: string
	hireable: boolean
	bio: string
	public_repos: number
	public_gists: number
	followers: number
	following: number
	created_at: string
	updated_at: string
}
/** The organization of a repository */
export interface GitHubOrganizationREST {
	login: string
	id: number
	node_id: string
	avatar_url: string
	gravatar_id: string
	url: string
	html_url: string
	followers_url: string
	following_url: string
	gists_url: string
	starred_url: string
	subscriptions_url: string
	organizations_url: string
	repos_url: string
	events_url: string
	received_events_url: string
	type: string
	site_admin: boolean
}

/** The permissions of a repository */
export interface GitHubPermissionsREST {
	admin: boolean
	push: boolean
	pull: boolean
}

/**
 * GitHub's response to getting a repository.
 * https://developer.github.com/v3/repos/#list-contributors
 */
export interface GitHubContributorREST {
	login: string
	id: number
	node_id: string
	avatar_url: string
	gravatar_id: string
	url: string
	html_url: string
	followers_url: string
	following_url: string
	gists_url: string
	starred_url: string
	subscriptions_url: string
	organizations_url: string
	repos_url: string
	events_url: string
	received_events_url: string
	/* Not sure what this means, however it is set to `"User"` in the example. */
	type: string
	/* Whether they are an admin */
	site_admin: boolean
	/** Count of how many contributions */
	contributions: number
}
export type GitHubContributorsREST = Array<GitHubContributorREST>

/**
 * GitHub's response to getting a members of an organization
 * https://developer.github.com/v3/orgs/members/#members-list
 */
export interface GitHubMemberREST {
	login: string
	id: number
	node_id: string
	avatar_url: string
	gravatar_id: string
	url: string
	html_url: string
	followers_url: string
	following_url: string
	gists_url: string
	starred_url: string
	subscriptions_url: string
	organizations_url: string
	repos_url: string
	events_url: string
	received_events_url: string
	type: string
	site_admin: boolean
}
export type GitHubMembersREST = Array<GitHubMemberREST>

/**
 * GitHub's response to searching for repositories
 * https://developer.github.com/v3/search/#search-repositories
 */
export interface GitHubSearchREST {
	total_count: number
	incomplete_results: boolean
	items: GitHubSearchRepositoryREST[]
}
export type GitHubsearchResponseREST = StrictUnion<
	GitHubError | GitHubSearchREST
>

/** The license of a repository */
export interface GitHubLicenseREST {
	key: string
	name: string
	spdx_id: string
	url: string
	node_id: string
}

/** The owner of a repository */
export interface GitHubOwnerREST {
	login: string
	id: number
	node_id: string
	avatar_url: string
	gravatar_id: string
	url: string
	received_events_url: string
	type: string
}

/** Search results return a subset of the full repository results */
export interface GitHubSearchRepositoryREST {
	id: number
	node_id: string
	name: string
	full_name: string
	owner: GitHubOwnerREST
	private: boolean
	html_url: string
	description: string
	fork: boolean
	url: string
	created_at: Date
	updated_at: Date
	pushed_at: Date
	homepage: string
	size: number
	stargazers_count: number
	watchers_count: number
	language: string
	forks_count: number
	open_issues_count: number
	master_branch: string
	default_branch: string
	score: number
}

/**
 * GitHub's response to getting a repository
 * https://developer.github.com/v3/repos/#get
 */
export interface GitHubRepositoryREST extends GitHubSearchRepositoryREST {
	archive_url: string
	assignees_url: string
	blobs_url: string
	branches_url: string
	collaborators_url: string
	comments_url: string
	commits_url: string
	compare_url: string
	contents_url: string
	contributors_url: string
	deployments_url: string
	downloads_url: string
	events_url: string
	forks_url: string
	git_commits_url: string
	git_refs_url: string
	git_tags_url: string
	git_url: string
	issue_comment_url: string
	issue_events_url: string
	issues_url: string
	keys_url: string
	labels_url: string
	languages_url: string
	merges_url: string
	milestones_url: string
	notifications_url: string
	pulls_url: string
	releases_url: string
	ssh_url: string
	stargazers_url: string
	statuses_url: string
	subscribers_url: string
	subscription_url: string
	tags_url: string
	teams_url: string
	trees_url: string
	clone_url: string
	mirror_url: string
	hooks_url: string
	svn_url: string
	is_template: boolean
	topics: string[]
	has_issues: boolean
	has_projects: boolean
	has_wiki: boolean
	has_pages: boolean
	has_downloads: boolean
	archived: boolean
	disabled: boolean
	visibility: string
	permissions: GitHubPermissionsREST
	allow_rebase_merge: boolean
	template_repository: null
	allow_squash_merge: boolean
	allow_merge_commit: boolean
	subscribers_count: number
	network_count: number
	license?: GitHubLicenseREST
	organization?: GitHubOrganizationREST
	parent?: GitHubRepositoryREST
	source?: GitHubRepositoryREST
}

export type Formats =
	| 'package'
	| 'json'
	| 'string'
	| 'text'
	| 'markdown'
	| 'html'
	| 'raw'
export const formats: Array<Formats> = [
	'package',
	'json',
	'string',
	'text',
	'markdown',
	'html',
	'raw',
]
export interface FormatOptions extends FellowFormatOptions {
	/** The format to render the result as */
	format?: Formats
	/** The string to join groups of backers for textual formats */
	joinBackers?: string
	/** The string to join individual backers for textual formats */
	joinBacker?: string

	/** Whether or not to display/modify authors? */
	authors?: boolean
	/** Whether or not to display/modify maintainers? */
	maintainers?: boolean
	/** Whether or not to display/modify contributors? */
	contributors?: boolean

	/** Whether or not to display/modify funders? */
	funders?: boolean
	/** Whether or not to display/modify sponsors? */
	sponsors?: boolean
	/** Whether or not to display/modify donors? */
	donors?: boolean
}

/** Field names that we consider backers */
export type BackerFields =
	| 'authors'
	| 'maintainers'
	| 'contributors'
	| 'funders'
	| 'sponsors'
	| 'donors'

/** Field names that we consider backers */
export const backerFields: Array<BackerFields> = [
	'authors',
	'maintainers',
	'contributors',
	'funders',
	'sponsors',
	'donors',
]

/** Collection of Sponsors, Funders, and Backers */
export interface Backers {
	/* Copyright Owners of the GitHub Repository */
	authors: Array<Fellow>
	/* Admins/Maintainers/Publishers of the GitHub Repository */
	maintainers: Array<Fellow>
	/* Contributors of the GitHub Repository */
	contributors: Array<Fellow>

	/* Initial financial backers of the GitHub Repository */
	funders: Array<Fellow>
	/* Active financial backers of the GitHub Repository */
	sponsors: Array<Fellow>
	/* Historical financial backers of the GitHub Repository */
	donors: Array<Fellow>
}

// ====================================
// GitHub API Methods

/**
 * Check whether or not sufficient GitHub credentials were supplied.
 * @returns `true` if valid
 * @throws if invalid
 */
export function validate(credentials: GitHubCredentials = envCredentials) {
	const accessToken = getAccessToken(credentials)
	if (
		accessToken ||
		(credentials.GITHUB_CLIENT_ID && credentials.GITHUB_CLIENT_SECRET)
	) {
		return true
	} else {
		throw new Error(
			'missing github credentials; provide `GITHUB_ACCESS_TOKEN` or `GITHUB_TOKEN`, or a combination of `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`',
		)
	}
}

/**
 * Get the desired GitHub Access Token from the credentials.
 * You probably want to use {@link fetch} directly, instead of going through this method.
 */
export function getAccessToken(
	credentials: GitHubCredentials = envCredentials,
): string | null {
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
	credentials: GitHubCredentials = envCredentials,
	params = new URLSearchParams(),
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

export function applySearchParams(
	target: URLSearchParams,
	source: URLSearchParams | Record<string, string> | null | undefined,
) {
	if (source) {
		if (source instanceof URLSearchParams) {
			source.forEach((value, key) => target.set(key, value))
		} else {
			Object.entries(source).forEach(([key, value]) => target.set(key, value))
		}
	}
}

/**
 * Remove any GitHub Credentials from a URL Search Params instance.
 * You probably want to use {@link fetch} directly, instead of going through this method.
 */
export function removeSearchParams(params: URLSearchParams) {
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
		'$1$2=REDACTED',
	)
}

/**
 * Get the GitHub Authorization as a Query String.
 * You probably want to use {@link getURL} directly, instead of going through this method.
 */
export function getQueryString(
	credentials: GitHubCredentials = envCredentials,
) {
	return getSearchParams(credentials).toString()
}

/**
 * Get the GitHub Authorization Header.
 * Use as the `Authorization` header within {@link fetch} calls.
 * You probably want to use {@link getHeaders} or {@link fetch} directly, instead of going through this method.
 * @throws If no valid GitHub Authorization was provided.
 */
export function getAuthHeader(credentials: GitHubCredentials = envCredentials) {
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
	credentials: GitHubCredentials = envCredentials,
	headers: Record<string, string> = {},
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
	opts: Pick<
		QueryOptions,
		'credentials' | 'url' | 'pathname' | 'searchParams'
	> = {},
) {
	// fetch url
	const url = new URL(
		opts.url ||
			(opts.credentials || envCredentials).GITHUB_API_URL ||
			(opts.credentials || envCredentials).GITHUB_API ||
			'https://api.github.com',
	)

	// add user params
	applySearchParams(url.searchParams, opts.searchParams)

	// ensure that there are no credentials in the URL
	removeSearchParams(url.searchParams)

	// add user pathname
	// the convoluted way of doing this is to make sure that with or without / is valid
	// as the GITHUB_API hostname may be something like `https://bevry.me/api/github`
	if (opts.pathname) {
		if (opts.pathname.includes('://'))
			throw new Error(
				`Received pathname ${opts.pathname} which is not a pathname but a URL`,
			)
		url.pathname = [
			url.pathname.replace(/^[/]+|[/]+$/, ''),
			opts.pathname.replace(/^[/]+|[/]+$/, ''),
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
	opts: Pick<
		QueryOptions,
		'credentials' | 'url' | 'pathname' | 'searchParams'
	> = {},
): URL {
	// fetch url
	const url = getURL(opts)

	// add auth params
	getSearchParams(opts.credentials, url.searchParams)

	// return
	return url
}

/**
 * Fetches a GitHub REST API response with authentication, parsing, waiting, pooling, paging.
 * If the credentials property is nullish, then the environment variables are attempted.
 * If the user agent is nullish, then it will be set to `"@bevry/github"`
 */
export async function queryREST<T>(opts: QueryOptions = {}): Promise<T> {
	// defaults
	opts.pool ??= new PromisePool(opts.concurrency)
	const searchParams = new URLSearchParams()
	applySearchParams(searchParams, opts.searchParams)
	if (opts.page != null || opts.pages != null || opts.size != null) {
		opts.page ??= 1
		opts.pages ??= 0
		opts.size ??= 100
	}
	if (opts.page) searchParams.set('page', String(opts.page))
	if (opts.size) searchParams.set('per_page', String(opts.size))

	// prepare fetch
	const url = getURL({ ...opts, searchParams }) // searchParams consumed here
	const fetchOpts: RequestInit = {
		headers: getHeaders(opts.credentials, {
			'User-Agent': opts.userAgent || '@bevry/github',
			...(opts.headers || {}),
		}),
		method: opts.method,
		body: opts.body,
	}

	// fetch in the pool
	let error: Errlop | null = null
	let responseREST: Response
	let responseJSON: any // GitHubRESTResponse<T>
	await opts.pool.open(async () => {
		responseREST = await fetch(url, fetchOpts)
		while (responseREST.status === 429) {
			console.warn(
				`Request to ${url} failed with status 429: Too Many Requests, will try again in a minute...`,
			)
			await wait(60 * 1000)
			responseREST = await fetch(url, fetchOpts)
		}
	})

	// check status
	if (responseREST!.ok === false) {
		error = new Errlop(
			`Request to ${url} failed with status ${responseREST!.status}: ${
				responseREST!.statusText
			}`,
			error,
		)
	}

	// parse
	try {
		responseJSON = await responseREST!.json()
	} catch (err) {
		responseJSON = {} // workaround os the rest doesn't fail
		error = new Errlop(`Request to ${url} failed to produce valid JSON`, error)
	}

	// check for errors
	for (const message of [
		responseJSON.message || '',
		...(responseJSON.errors || []).map((e: any) => e.message || ''),
	]) {
		if (message) error = new Errlop(message, error)
	}

	// throw error if there is one
	if (error) throw error

	// paging and array checks
	if (opts.page != null) {
		// check
		if (!Array.isArray(responseJSON)) {
			if (Array.isArray(responseJSON.items)) {
				responseJSON = responseJSON.items
			} else {
				throw new Error(`Request to ${url} did not return an array as expected`)
			}
		}
		if (responseJSON.length === 0) {
			return [] as T
		}

		// another page?
		const within = !opts.pages || opts.page < opts.pages
		const hasNextPage = responseJSON.length === opts.size && within
		if (hasNextPage) {
			append(
				responseJSON,
				await queryREST<any>({
					...opts,
					page: opts.page + 1,
				}),
			)
		}
	}

	// return
	return responseJSON as T
}

/**
 * Fetches a GitHub GraphQL API response with authentication, parsing, waiting, pooling. NO PAGING.
 * If the credentials property is nullish, then the environment variables are attempted.
 * If the user agent is nullish, then it will be set to `"@bevry/github"`
 */
export async function queryGraphQL<T>(
	query: string,
	opts: QueryOptions = {},
): Promise<T> {
	// prepare
	opts.pool ??= new PromisePool(opts.concurrency)

	// prepare fetch
	// https://docs.github.com/en/graphql/overview/explorer
	const fetchOpts = {
		headers: getHeaders(opts.credentials, {
			'User-Agent': opts.userAgent || '@bevry/github',
			...(opts.headers || {}),
		}),
	}

	// fetch in the pool
	let error: Errlop | null = null
	let responseGraphQL: any
	await opts.pool.open(async () => {
		responseGraphQL = await octokitGraphQL(query, fetchOpts)
		while (responseGraphQL.status === 429) {
			console.warn(
				`GraphQL returned status code [429 Too Many Requests] will try again in a minute`,
			)
			await wait(60 * 1000)
			responseGraphQL = await octokitGraphQL(query, fetchOpts)
		}
	})

	// check for errors
	for (const message of [
		responseGraphQL.message || '',
		...(responseGraphQL.errors || []).map((e: any) => e.message || ''),
	]) {
		if (message) error = new Errlop(message, error)
	}

	// throw error if there is one
	if (error) throw error

	// return
	return (
		opts.resultField ? responseGraphQL[opts.resultField] : responseGraphQL
	) as T
}

// =================================
// GitHub Misc

/**
 * Get the latest commit for a github repository
 * @param slug the organization/user name along with the repository name, e.g. `bevry/github`
 */
export default async function getGitHubLatestCommit(
	slug: string,
	opts: QueryOptions = {},
): Promise<string> {
	// fetch
	const commits: Array<GitHubCommitREST> = await queryREST({
		...opts,
		pathname: `repos/${slug}/commits`,
	})

	// unexpected result
	const commit = commits[0] && commits[0].sha
	if (!commit)
		throw new Error(`GitHub Commit was not present in response for: ${slug}`)

	// success
	return commit
}

// =================================
// GitHub Repository

/**
 * Fetch data for a repository from a repository slug (org/name)
 * @param slug repository slug, such as `'bevry/github'`
 */
export async function getGitHubRepository(
	slug: string,
	opts: QueryOptions = {},
): Promise<GitHubRepositoryREST> {
	const result = await queryREST<GitHubRepositoryREST>({
		...opts,
		pathname: `repos/${slug}`,
	})
	if (!result || !result.full_name)
		throw new Error(
			`GitHub Repository was not present in response for: ${slug}`,
		)
	return result
}

/**
 * Fetch data for repositories from their repository slugs
 * @param slugs array of repository slugs, such as `['bevry/github']`
 */
export async function getGitHubRepositories(
	slugs: string[],
	opts: QueryOptions = {},
): Promise<Array<GitHubRepositoryREST>> {
	return await Promise.all(slugs.map((slug) => getGitHubRepository(slug, opts)))
}

/**
 * Fetch data for repositories from a search, will iterate all subsequent pages
 * @param search the search query to send to GitHub, such as `@bevry language:typescript`
 */
export async function getGitHubRepositoriesFromSearch(
	search: string,
	opts: QueryOptions = {},
): Promise<Array<GitHubSearchRepositoryREST>> {
	return await queryREST({
		...opts,
		pathname: `search/repositories`,
		pages: opts.pages ?? 0,
		searchParams: {
			q: search,
		},
	})
}

/** Fetch repositories for these usernames (users, organizations) */
export async function getGitHubRepositoriesFromUsernames(
	usernames: string[],
	opts: QueryOptions = {},
): Promise<Array<GitHubSearchRepositoryREST>> {
	const query = usernames.map((username) => `@${username}`).join('%20')
	return await getGitHubRepositoriesFromSearch(query, opts)
}

// ====================================
// GitHub Models

/**
 * Fetch fellow from the GitHub User GraphQL API.
 * @param username the profile to fetch the data for
 */
export async function getGitHubUser(
	username: string,
	opts: BackerQueryOptions = {},
): Promise<Fellow> {
	try {
		const githubProfile: GitHubUserGraphQL = await queryGraphQL(
			/* GraphQL */ `{
				user(login: "${username}") {
					bio
					company
					email
					isHireable
					location
					login
					name
					url
					websiteUrl
				}
			}`,
			{ ...opts, resultField: 'user' },
		)

		// verify
		if (!githubProfile)
			throw new Error(`No GitHub User was returned for username: ${username}`)

		// add these items
		const fellow = Fellow.ensure({
			githubProfile,
			company: githubProfile.company,
			description: githubProfile.bio,
			email: githubProfile.email,
			githubUrl: githubProfile.url,
			githubUsername: githubProfile.login,
			hireable: githubProfile.isHireable,
			location: githubProfile.location,
			name: githubProfile.name,
			websiteUrl: githubProfile.websiteUrl,
		})
		return fellow
	} catch (err: any) {
		throw new Errlop(
			`Fetching GitHub User failed for username: ${username}`,
			err,
		)
	}
}

/**
 * Fetch fellow from the GitHub Organization GraphQL API.
 * @param username the profile to fetch the data for
 */
export async function getGitHubOrganization(
	username: string,
	opts: BackerQueryOptions = {},
): Promise<Fellow> {
	// fetch
	// https://docs.github.com/en/graphql/overview/explorer
	try {
		const githubProfile: GitHubOrganizationGraphQL = await queryGraphQL(
			/* GraphQL */ `{
				organization(login: "${username}") {
					description
					email
					location
					login
					name
					url
					websiteUrl
				}
			}`,
			{ ...opts, resultField: 'organization' },
		)

		// verify
		if (!githubProfile)
			throw new Error(
				`No GitHub Organization was returned for username: ${username}`,
			)

		// add these items
		const fellow = Fellow.ensure({
			githubProfile,
			description: githubProfile.description,
			email: githubProfile.email,
			githubUrl: githubProfile.url,
			githubUsername: githubProfile.login,
			location: githubProfile.location,
			name: githubProfile.name,
			websiteUrl: githubProfile.websiteUrl,
		})
		return fellow
	} catch (err: any) {
		throw new Errlop(
			`Fetching GitHub Organization failed for username: ${username}`,
			err,
		)
	}
}

/** Fetch a fellow via the GitHub REST API */
export async function getGitHubProfileFromApiUrl(
	url: string,
	opts: QueryOptions = {},
): Promise<Fellow> {
	if (url.includes('api.github.com') === false)
		throw new Error(`Cannot fetch the GitHub Profile for non-API URL: ${url}`)
	const githubProfile = await queryREST<GitHubProfileREST>({
		...opts,
		url,
	})
	const fellow = Fellow.ensure({
		githubProfile,
		company: githubProfile.company,
		description: githubProfile.bio,
		email: githubProfile.email,
		githubUrl: githubProfile.html_url,
		githubUsername: githubProfile.login,
		hireable: githubProfile.hireable,
		homepage: githubProfile.blog,
		location: githubProfile.location,
		name: githubProfile.name,
	})
	return fellow
}

/** Fetch a fellow via the GitHub API */
export async function getGitHubProfile(
	username: string,
	opts: QueryOptions = {},
): Promise<Fellow> {
	// await necessary for try catch to catch promise failures
	if (username.includes('api.github.com')) {
		return await getGitHubProfileFromApiUrl(username, opts)
	}
	try {
		return await getGitHubUser(username, opts)
	} catch (userError) {
		try {
			return await getGitHubOrganization(username, opts)
		} catch (organizationError) {
			throw new Errlop(
				`Failed to fetch the GitHub Profile for the username: ${username}`,
				new Errlop(organizationError, userError),
			)
		}
	}
}

export interface GitHubSponsorsBackers {
	sponsors: Array<Fellow>
	donors: Array<Fellow>
}

/** Get a Fellow of a GitHub Sponsors member */
function getGitHubSponsorsProfile(githubProfile: GitHubSponsorGraphQL): Fellow {
	return Fellow.ensure({
		githubProfile,
		company: githubProfile.company,
		description: githubProfile.bio || githubProfile.description,
		email: githubProfile.email,
		githubUrl: githubProfile.url,
		githubUsername: githubProfile.login,
		hireable: githubProfile.isHireable,
		location: githubProfile.location,
		name: githubProfile.name,
		websiteUrl: githubProfile.websiteUrl,
	})
}

/** Fetch backers from the GitHub Sponsors API */
export async function getBackersFromGitHubSponsors(
	username: string,
	opts: BackerQueryOptions = {},
): Promise<GitHubSponsorsBackers> {
	try {
		// fetch
		// https://docs.github.com/en/graphql/reference/interfaces#sponsorable
		// https://stackoverflow.com/a/65272597/130638
		// https://docs.github.com/en/graphql/reference/objects#sponsorconnection
		// sponsors (first: 100) {
		// https://docs.github.com/en/graphql/overview/explorer
		// @todo no idea how to fetch the cents the user gave in the past month
		const profiles: Array<GitHubSponsorGraphQL> = []
		let hasNextPage = true,
			afterCursor = opts.afterCursor
		while (hasNextPage) {
			const filters = [`first: ${opts.size || 100}`] // do not apply size default, as that causes shared opts to have pagination which isn't desired
			if (afterCursor) filters.push(`after: "${afterCursor}"`)
			const responseData: GitHubSponsorsGraphQL = await queryGraphQL(
				/* GraphQL */ `{
					user(login: "${username}") {
						sponsors(${filters.join(', ')}) {
							pageInfo {
								hasNextPage
								endCursor
							}
							nodes {
								... on User {
									bio
									company
									email
									isHireable
									location
									login
									name
									url
									websiteUrl
								}
								... on Organization {
									description
									email
									location
									login
									name
									url
									websiteUrl
								}
							}
						}
					}
				}`,
				opts,
			)
			const nodes = responseData.user?.sponsors?.nodes
			if (!Array.isArray(nodes))
				throw new Error(
					`Response did not include an array of GitHub Sponsors for username: ${username}`,
				)
			append(profiles, nodes)
			const pageInfo = responseData.user?.sponsors?.pageInfo || {
				hasNextPage: false,
				endCursor: '',
			}
			hasNextPage = pageInfo.hasNextPage
			afterCursor = pageInfo.endCursor
		}

		// convert
		const sponsors = Fellow.add(profiles.map(getGitHubSponsorsProfile))
		return { sponsors, donors: sponsors }
	} catch (err: any) {
		throw new Errlop(
			`Fetching GitHub Sponsors failed for username: ${username}`,
			err,
		)
	}
}

/** Fetch the contributors (minus bots) of a repository via the GitHub REST API */
export async function getGitHubContributors(
	slug: string,
	opts: QueryOptions = {},
): Promise<Array<Fellow>> {
	// fetch
	// https://docs.github.com/en/rest/reference/repos#list-repository-contributors
	const data = await queryREST<GitHubContributorsREST>({
		...opts,
		pathname: `repos/${slug}/contributors`,
		pages: opts.pages ?? 0,
	})
	if (data.length === 0) return []

	// prepare
	const results = new Set<Fellow>()

	// add these items
	append(
		results,
		await Promise.all(
			data
				.filter((profile) => profile.login.includes('[bot]') === false)
				.map(async (profile) => {
					const fellow = await getGitHubProfileFromApiUrl(profile.url, opts)
					fellow.contributionsOfRepository.set(slug, profile.contributions)
					fellow.contributorOfRepositories.add(slug)
					return fellow
				}),
		),
	)

	// return it all
	return Fellow.sort(results)
}

/** Fetch members from a GitHub organization */
export async function getGitHubMembersFromOrganization(
	org: string,
	opts: QueryOptions = {},
): Promise<Array<Fellow>> {
	// fetch
	// https://docs.github.com/en/rest/reference/orgs#list-public-organization-members
	const data = await queryREST<GitHubMembersREST>({
		...opts,
		pathname: `orgs/${org}/public_members`,
	})
	if (data.length === 0) return []

	// prepare
	const members: Set<Fellow> = new Set<Fellow>()

	// add these items
	append(
		members,
		await Promise.all(
			data.map((profile) => getGitHubProfileFromApiUrl(profile.url, opts)),
		),
	)

	// return it all
	return Fellow.sort(members)
}

/** Fetch members from multiple GitHub organizations */
export async function getGitHubMembersFromOrganizations(
	orgs: Array<string>,
	opts: BackerQueryOptions = {},
): Promise<Array<Fellow>> {
	const lists = await Promise.all(
		orgs.map((org) => getGitHubMembersFromOrganization(org, opts)),
	)
	return flatten(lists)
}

/** Fetch backers from a GitHub repository slug */
export async function getBackersFromRepository(
	slug: string,
	opts: BackerQueryOptions = {},
): Promise<Backers> {
	try {
		// prepare
		const packageData: PackageData = await getPackageData(slug, {})
		let fundingData: FundingData
		const fallbackUsername = slug.split('/')[0]

		// get badge only usernames
		const thanksdevGithubUsername: string =
			packageData.badges?.config?.thanksdevGithubUsername || fallbackUsername

		// get badge or funding usernames
		let githubSponsorsUsername: string =
			packageData.badges?.config?.githubSponsorsUsername || ''
		let opencollectiveUsername: string =
			packageData.badges?.config?.opencollectiveUsername || ''
		if (!githubSponsorsUsername || !opencollectiveUsername) {
			fundingData = await getFundingData(slug, {})
			if (!githubSponsorsUsername) {
				if (typeof fundingData.github === 'string') {
					githubSponsorsUsername = fundingData.github || ''
				} else if (
					Array.isArray(fundingData.github) &&
					fundingData.github.length >= 1
				) {
					githubSponsorsUsername = fundingData.github[0] || ''
				}
			}
			if (!opencollectiveUsername) {
				if (typeof fundingData.open_collective === 'string') {
					opencollectiveUsername = fundingData.open_collective || ''
				} else if (
					Array.isArray(fundingData.open_collective) &&
					fundingData.open_collective.length >= 1
				) {
					opencollectiveUsername = fundingData.open_collective[0] || ''
				}
			}
		}

		// prepare result from package data
		const result = getBackersFromPackageData(packageData)

		// add contributors
		try {
			const fetchedContributors = await getGitHubContributors(slug, opts)
			append(result.contributors, fetchedContributors)
		} catch (err) {
			console.warn(err)
		}

		// order by least details, to most accurate details, so ThanksDev, OpenCollective, GitHub Sponsors

		// ThanksDev
		if (thanksdevGithubUsername) {
			try {
				const fetchedBackers = await getBackersFromThanksDev(
					ThanksDevPlatform.GitHub,
					thanksdevGithubUsername,
					opts,
				)
				appendBackers(result, fetchedBackers)
			} catch (err) {
				console.warn(err)
			}
		} else {
			console.warn(`Unable to determine ThanksDev username for ${slug}`)
		}

		// OpenCollective
		if (opencollectiveUsername) {
			try {
				const fetchedBackers = await getBackersFromOpenCollective(
					opencollectiveUsername,
					opts,
				)
				appendBackers(result, fetchedBackers)
			} catch (err) {
				console.warn(err)
			}
		} else {
			console.warn(`Unable to determine OpenCollective username for ${slug}`)
		}

		// GitHubSponsors
		if (githubSponsorsUsername) {
			try {
				const fetchedBackers = await getBackersFromGitHubSponsors(
					githubSponsorsUsername,
					opts,
				)
				appendBackers(result, fetchedBackers)
			} catch (err) {
				console.warn(err)
			}
		} else {
			console.warn(`Unable to determine GitHub Sponsors username for ${slug}`)
		}

		// fetch additional details
		await Promise.all(
			Array.from(result.donors).map(async (fellow) => {
				if (fellow.githubUsername && !fellow.githubProfile) {
					const profile = await getGitHubProfile(fellow.githubUsername, opts)
				}
			}),
		)

		// attach to slug, which enables us to remove duplicates by fetching by slug
		// (duplicates can occur if new details allowed us to merge two old entries)
		attachBackersToGitHubSlug(result, slug)
		return {
			authors: Fellow.authorsOfRepository(slug),
			maintainers: Fellow.maintainersOfRepository(slug),
			contributors: Fellow.contributorsOfRepository(slug),
			funders: Fellow.fundersOfRepository(slug),
			sponsors: Fellow.sponsorsOfRepository(slug),
			donors: Fellow.donorsOfRepository(slug),
		}
	} catch (err) {
		const error = new Errlop(
			`Failed to fetch backers for GitHub Repository: ${slug}`,
			err,
		)
		console.warn(error)
		return {
			authors: [],
			maintainers: [],
			contributors: [],
			funders: [],
			sponsors: [],
			donors: [],
		}
	}
}

/** Fetch backers from package.json data */
export function getBackersFromPackageData(packageData: PackageData): Backers {
	// prepare
	const slug = getGitHubSlugFromPackageData(packageData)
	const authors = new Set<Fellow>()
	const maintainers = new Set<Fellow>()
	const contributors = new Set<Fellow>()
	const funders = new Set<Fellow>()
	const sponsors = new Set<Fellow>()
	const donors = new Set<Fellow>()

	// add package.json data
	append(authors, Fellow.add(packageData.author, packageData.authors))
	append(maintainers, Fellow.add(packageData.maintainers))
	append(
		contributors,
		Fellow.add(authors, maintainers, packageData.contributors),
	)
	append(funders, Fellow.add(packageData.funders))
	append(sponsors, Fellow.add(packageData.sponsors))
	append(donors, Fellow.add(funders, sponsors, packageData.donors))

	// remove duplicates of any that were merged after fetching the latest details
	return attachBackersToGitHubSlug(
		{
			authors: Fellow.sort(authors),
			maintainers: Fellow.sort(maintainers),
			contributors: Fellow.sort(contributors),
			funders: Fellow.sort(funders),
			sponsors: Fellow.sort(sponsors),
			donors: Fellow.sort(donors),
		},
		slug,
	)
}

/** For each backer, append to the result */
function appendBackers(target: Backers, source: Partial<Backers>): Backers {
	for (const field of backerFields) {
		const list = source[field]
		if (list) append(target[field], list)
	}
	return target
}

/** For each backer, attach them to the slug for the appropriate associations */
function attachBackersToGitHubSlug(
	result: Backers,
	slug: string | null,
): Backers {
	if (slug) {
		for (const author of result.authors) author.authorOfRepositories.add(slug)
		for (const maintainer of result.maintainers)
			maintainer.maintainerOfRepositories.add(slug)
		for (const contributor of result.contributors)
			contributor.contributorOfRepositories.add(slug)
		for (const funder of result.funders) funder.funderOfRepositories.add(slug)
		for (const sponsor of result.sponsors)
			sponsor.sponsorOfRepositories.add(slug)
		for (const donor of result.donors) donor.donorOfRepositories.add(slug)
	}
	return result
}

/** Fetch backers from GitHub repository slugs */
export async function getBackersFromRepositories(
	slugs: Array<string>,
	opts: BackerQueryOptions = {},
): Promise<Backers> {
	const results = await Promise.all(
		slugs.map((slug) => getBackersFromRepository(slug, opts)),
	)

	// de-duplicate across repos
	const authors = new Set<Fellow>()
	const maintainers = new Set<Fellow>()
	const contributors = new Set<Fellow>()
	const funders = new Set<Fellow>()
	const sponsors = new Set<Fellow>()
	const donors = new Set<Fellow>()
	for (const result of results) {
		append(authors, result.authors)
		append(maintainers, result.maintainers)
		append(contributors, result.contributors)
		append(funders, result.funders)
		append(sponsors, result.sponsors)
		append(donors, result.donors)
	}

	return {
		authors: Fellow.sort(authors),
		maintainers: Fellow.sort(maintainers),
		contributors: Fellow.sort(contributors),
		funders: Fellow.sort(funders),
		sponsors: Fellow.sort(sponsors),
		donors: Fellow.sort(donors),
	}
}

/**  Fetch backers for all repositories by these usernames (users, organizations) */
export async function getBackersFromUsernames(
	usernames: Array<string>,
	opts: BackerQueryOptions = {},
): Promise<Backers> {
	const repos = await getGitHubRepositoriesFromUsernames(usernames, opts)

	// filter out forks and grab the slugs
	const slugs = repos
		.filter((repo) => repo.fork !== true)
		.map((repo) => repo.full_name)

	// Fetch the backers for the repos
	return getBackersFromRepositories(slugs, opts)
}

/**
 * Fetch backers for all repositories that match a certain search query.
 * @param query the search query to send to GitHub, such as `@bevry language:typescript`
 */
export async function getBackersFromSearch(
	query: string,
	opts: BackerQueryOptions = {},
): Promise<Backers> {
	const repos = await getGitHubRepositoriesFromSearch(query, opts)

	// Just grab the slugs
	const slugs = repos.map((repo) => repo.full_name)

	// Fetch the backers for the repos
	return getBackersFromRepositories(slugs, opts)
}

// @TODO this is getting too complicated, let's just put this all into projectz, and go back to github-api
function renderBackersHeadings(output: any, headingLevel: number, packageData: PackageData | null = null): string {
	return [
		`<h${headingLevel}>Backers</h${headingLevel}>`,
		`<h${headingLevel + 1}>Code</h${headingLevel + 1}>`,
		getBadgesInCategory('contribute', packageData),
		data.authors.length
			? `<h${headingLevel + 2}>Authors</h${headingLevel + 2}>\n` +
				getPeopleHTML(data.authors, {
					displayYears: true,
					displayDescription: true
				})
			: '',
		data.maintainers.length
			? `<h${headingLevel + 2}>Maintainers</h${headingLevel + 2}>\n` +
				getPeopleHTML(data.maintainers, {
					displayDescription: true
				})
			: '',
		data.contributors.length
			? `<h${headingLevel + 2}>Contributors</h${headingLevel + 2}>\n` +
				getPeopleHTML(data.contributors, {
					displayContributions: true,
					githubRepoSlug: data.github.slug,
				})
			: '',
		`<h${headingLevel + 1}>Finances</h${headingLevel + 1}>`,
		getBadgesInCategory('funding', data),
		data.funders.length
			? `<h${headingLevel + 2}>Funders</h${headingLevel + 2}>\n` +
				getPeopleHTML(data.funders, { displayDescription: true }) // @todo display descriptions if also sponsor
			: '',
		data.sponsors.length
			? `<h${headingLevel + 2}>Sponsors</h${headingLevel + 2}>\n` +
				getPeopleHTML(data.sponsors, { displayDescription: true }) // @Todo display descriptions if also sponsor
			: '',
		data.donors.length
			? `<h${headingLevel + 2}>Donors</h${headingLevel + 2}>\n` +
				getPeopleHTML(data.donors) // @Todo display descriptions if also sponsor
			: '',
	]
		.filter(Boolean)
		.join('\n\n')
}

function renderJoin(output: any, join?: string) {
	if (join == null) {
		return output
	}
	const parts = []
	for (const [key, value] of Object.entries(output)) {
		if (value) {
			if (Array.isArray(value)) {
				parts.push(...value)
			} else {
				parts.push(value)
			}
		}
	}
	if (join === '<ul>' || join === '<ol>') {
		return (
			join +
			parts.map((i) => `<li>${i}</li>`).join('\n') +
			`</${join.substring(1, 3)}>`
		)
	} else if (join === '<h1>' ) {

	} else {
		return parts.join(join)
	}
}

function getFieldFormatOptions(field: BackerFields, formatOptions: FormatOptions): FormatOptions {
	switch (field) {
		case 'authors':
			if ( ['markdown', 'html'].includes(formatOptions.format!) )
				return {
					displayYears: true,
					displayDescription: true,
					...formatOptions
				}
			return {
				displayYears: true,
				...formatOptions
			}
		case 'maintainers':
		case 'contributors':
			if ( ['markdown', 'html'].includes(formatOptions.format!) )
				return {
					displayContributions: true,
					...formatOptions
				}
			return formatOptions
		case 'funders':
		case 'sponsors':
			return {
				displayDescription: true,
				...formatOptions
			}
		default:
			return formatOptions
	}
}

/** Render a Backers result according to the desired format. */
export function renderBackers(
	result: Backers,
	formatOptions: FormatOptions,
	packageData: PackageData | null = null,
): any {
	// enable everything if nothing is enabled
	const allNull = backerFields
		.map((field) => formatOptions[field] == null)
		.every(Boolean)
	if (allNull) backerFields.forEach((field) => (formatOptions[field] = true))
	// render
	switch (formatOptions.format) {
		case 'json':
		case 'package': {
			const output: any =
				formatOptions.format === 'package' && packageData != null
					? Object.assign({}, packageData)
					: {}
			for (const field of backerFields) {
				if (formatOptions[field]) {
					if (result[field].length) {
						const customFormatOptions = getFieldFormatOptions(field, formatOptions)
						if (field === 'authors') {
							output.author = result[field]
								.map((i) =>
									i.toString(customFormatOptions),
								)
								.join(', ')
						} else {
							output[field] = result[field].map((i) =>
								i.toString(customFormatOptions),
							)
						}
					} else {
						delete output[field]
					}
				}
			}
			delete output.authors
			return formatOptions.format === 'package'
				? arrangePackageData(output)
				: output
		}
		case 'raw': {
			const output: any = {}
			for (const field of backerFields) {
				if (formatOptions[field]) {
					output[field] = result[field] || []
				}
			}
			return result
		}
		case 'string': {
			const output: any = {}
			for (const field of backerFields) {
				if (formatOptions[field] && result[field].length) {
					const customFormatOptions = getFieldFormatOptions(field, formatOptions)
					output[field] = renderJoin(
						result[field].map((i) => i.toString(customFormatOptions)),
						formatOptions.joinBacker,
					)
				}
			}
			if (formatOptions.joinBackers != null)
				return renderJoin(output, formatOptions.joinBackers)
			return output
		}
		case 'text': {
			// customise
			const prefixes = {
				authors: formatOptions.prefix,
				maintainers: formatOptions.prefix,
				contributors: formatOptions.prefix,
				funders: formatOptions.prefix,
				sponsors: formatOptions.prefix,
				donors: formatOptions.prefix,
			}
			if (formatOptions.prefix === '') {
				const nameAndSpace =
					(packageData?.title || packageData?.name || '') + ' '
				Object.assign(prefixes, {
					authors: `Thank you to ${nameAndSpace}author 🤍`,
					maintainers: `Thank you to ${nameAndSpace}maintainer 🤍`,
					contributors: `Thank you to ${nameAndSpace}contributor 🤍`,
					funders: `Thank you to ${nameAndSpace}funder 🤍`,
					sponsors: `Thank you to ${nameAndSpace}sponsor 🤍`,
					donors: `Thank you to ${nameAndSpace}donor 🤍`,
				})
			}
			// render
			const output: any = {}
			for (const field of backerFields) {
				if (formatOptions[field] && result[field].length) {
					const customFormatOptions = getFieldFormatOptions(field, formatOptions)
					output[field] = renderJoin(
						result[field].map((i) =>
							i.toText({ ...customFormatOptions, prefix: prefixes[field] }),
						),
						formatOptions.joinBacker,
					)
				}
			}
			if (formatOptions.joinBackers != null)
				return renderJoin(output, formatOptions.joinBackers)
			return output
		}
		case 'markdown': {
			const output: any = {}
			for (const field of backerFields) {
				if (formatOptions[field] && result[field].length) {
					const customFormatOptions = getFieldFormatOptions(field, formatOptions)
					output[field] = renderJoin(
						result[field].map((i) => i.toMarkdown(customFormatOptions)),
						formatOptions.joinBacker,
					)
				}
			}
			if (formatOptions.joinBackers != null)
				return renderJoin(output, formatOptions.joinBackers)
			return output
		}
		case 'html': {
			const output: any = {}
			for (const field of backerFields) {
				const customFormatOptions = getFieldFormatOptions(field, formatOptions)
				if (formatOptions[field] && result[field].length) {
					output[field] = renderJoin(
						result[field].map((i) => i.toHTML(customFormatOptions)),
						formatOptions.joinBacker,
					)
				}
			}
			if (formatOptions.joinBackers != null)
				return renderJoin(output, formatOptions.joinBackers)
			return output
		}
		default: {
			throw new Error(`Invalid format [${formatOptions.format}]`)
		}
	}
}
