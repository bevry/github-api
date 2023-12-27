// external
import type { StrictUnion } from 'simplytyped'
import wait from '@bevry/wait'
import PromisePool from 'native-promise-pool'
import { graphql as octokitGraphQL } from '@octokit/graphql'
import { load as parseYAML } from 'js-yaml'
import { append, flatten } from '@bevry/list'
import trimEmptyKeys from 'trim-empty-keys'
import Errlop from 'errlop'
import arrangePackageData from 'arrange-package-json'
import Fellow, { Format as FellowFormat, fetchOk, fetchNotOk } from 'fellow'
export { Fellow, PromisePool, Errlop }

// defaults
import { env } from 'node:process'
const envCredentials = env as GitHubCredentials

// ====================================
// Our Types

/** Field names that we consider backers */
export type BackerFields =
	| 'author'
	| 'authors'
	| 'maintainers'
	| 'contributors'
	| 'funders'
	| 'sponsors'
	| 'donors'

/** Field names that we consider backers */
export const backerFields: Array<BackerFields> = [
	'author',
	'authors',
	'maintainers',
	'contributors',
	'funders',
	'sponsors',
	'donors',
]

/** Collection of Sponsors, Funders, and Backers */
export interface Backers {
	/* Active copyright owners of the project */
	author: Array<Fellow>
	/* Eternal authors of the project */
	authors: Array<Fellow>
	/* Active admins/maintainers/publishers of the project */
	maintainers: Array<Fellow>
	/* Eternal contributors of the project */
	contributors: Array<Fellow>

	/* Initial financial backers of the project */
	funders: Array<Fellow>
	/* Active financial backers of the project */
	sponsors: Array<Fellow>
	/* Eternal financial backers of the project */
	donors: Array<Fellow>
}

/** A rendering style for {@link Backers} */
export enum BackersRenderFormat {
	/** Renders as {@link BackersRenderResult.string} with appropriate defaults, intended for `package.json` merging. */
	string = FellowFormat.string,
	/** Renders as {@link BackersRenderResult.text} with appropriate defaults, intended for human-readable outputs.*/
	text = FellowFormat.text,
	/** Renders as {@link BackersRenderResult.markdown} with appropriate defaults, intended for readme outputs. */
	markdown = FellowFormat.markdown,
	/** Renders as {@link BackersRenderResult.html} with appropriate defaults, intended for readme outputs. */
	html = FellowFormat.html,

	/** Same as {@link BackersRenderFormat.string} however merges with {@link BackersRenderOptions.packageData} if it exists. */
	package = 'package',
	/** Used for license files, author and authors are an array of strings, using {@link Fellow.toMarkdown} with appropriate defaults. */
	copyright = 'copyright',
	/** Used for shoutout.txt files, outputs a string with shoutouts to contributors, funders, and sponsors, using {@link Fellow.toText} with appropriate defaults. */
	shoutout = 'shoutout',
	/** Used for initial changelog entry, outputs a string with shoutout to funders and sponsors, using {@link Fellow.toMarkdown} with appropriate defaults. */
	release = 'release',
	/** Used for subsequent changelog entries, outputs a string with shoutout to sponsors, using {@link Fellow.toMarkdown} with appropriate defaults. */
	update = 'update',
}

/** Backers Render Result */
export interface BackersRenderResult {
	/** Renders using {@link Fellow.toString} with appropriate defaults, intended for `package.json` merging. */
	[BackersRenderFormat.string]: {
		/* CSV string of active copyright owners of the project, including years and only the first url */
		author?: string
		/* Eternal authors of the project, including years and description */
		authors?: Array<string>
		/* Active admins/maintainers/publishers of the project */
		maintainers?: Array<string>
		/* Eternal contributors of the project */
		contributors?: Array<string>

		/* Initial financial backers of the project, including description */
		funders?: Array<string>
		/* Active financial backers of the project, including description */
		sponsors?: Array<string>
		/* Eternal financial backers of the project, including description */
		donors?: Array<string>
	}
	/** Renders using {@link Fellow.toText} with appropriate defaults, intended for human-readable outputs. */
	[BackersRenderFormat.text]: {
		author?: Array<string>
		authors?: Array<string>
		maintainers?: Array<string>
		contributors?: Array<string>
		funders?: Array<string>
		sponsors?: Array<string>
		donors?: Array<string>
	}
	/** Renders using {@link Fellow.toMarkdown} with appropriate defaults, intended for readme outputs. */
	[BackersRenderFormat.markdown]: {
		author?: Array<string>
		authors?: Array<string>
		maintainers?: Array<string>
		contributors?: Array<string>
		funders?: Array<string>
		sponsors?: Array<string>
		donors?: Array<string>
	}
	/** Renders using {@link Fellow.toHtml} with appropriate defaults, intended for readme outputs. */
	[BackersRenderFormat.html]: {
		author?: Array<string>
		authors?: Array<string>
		maintainers?: Array<string>
		contributors?: Array<string>
		funders?: Array<string>
		sponsors?: Array<string>
		donors?: Array<string>
	}

	/** Same as {@link BackersRenderResult.string}, however merges with {@link BackersRenderOptions.packageData} if it exists. */
	[BackersRenderFormat.package]: {
		/** {@link BackersRenderOptions.packageData} properties*/
		[key: string]: any

		/* CSV string of active copyright owners of the project, including years and only the first url */
		author?: string
		/* Eternal authors of the project, including years and description */
		authors?: Array<string>
		/* Active admins/maintainers/publishers of the project */
		maintainers?: Array<string>
		/* Eternal contributors of the project */
		contributors?: Array<string>

		/* Initial financial backers of the project, including description */
		funders?: Array<string>
		/* Active financial backers of the project, including description */
		sponsors?: Array<string>
		/* Eternal financial backers of the project, including description */
		donors?: Array<string>
	}
	/** Renders using {@link Fellow.toHtml} with appropriate defaults, intended for readme outputs. */
	[BackersRenderFormat.copyright]: {
		/** Active copyright owners of the project, including copyright and years */
		author?: Array<string>
		/** Eternal authors of the project, including copyright and years */
		authors?: Array<string>
	}
	/** Renders using {@link Fellow.toText} with shoutouts for contributors, funders, and sponsors. */
	[BackersRenderFormat.shoutout]: string
	/** Renders using {@link Fellow.toMarkdown} with shoutouts for funders and sponsors. */
	[BackersRenderFormat.release]: string
	/** Renders using {@link Fellow.toMarkdown} with shoutouts for sponsors. */
	[BackersRenderFormat.update]: string
}

/** Options for rendering {@link Backers} */
export interface BackersRenderOptions {
	/** The render format, if empty will throw. */
	format?: BackersRenderFormat | null
	/** If provided with {@link BackersRenderFormat.package} will merge with the result data. */
	packageData?: PackageData | null
	/** If provided with {@link BackersRenderFormat.html} will be used to generate contribtuion links. If `true` fills in from {@link BackersRenderOptions.packageData} if present. */
	githubSlug?: string | boolean | null
	/** If provided with {@link BackersRenderFormat.shoutout} will be used to prefix each shoutout. If `true` fills in from {@link BackersRenderOptions.packageData} if present. */
	projectName?: string | boolean | null
}

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

/** Export some types we consume, so that others can also use them. Needs at least a {@link BackersQueryOptions.githubSlug} or {@link BackersQueryOptions.packageData} */
export interface BackersQueryOptions extends QueryOptions {
	/** The GitHub slug to determine backers for. If false, don't autodetect. */
	githubSlug?: string | boolean | null
	/** The package.json data to determine backers for. If false, don't autodetect. */
	packageData?: PackageData | boolean | null
	/** The GitHub Sponsors username to determine backers for. If false, don't autodetect. */
	githubSponsorsUsername?: string | boolean | null
	/** The OpenCollective username to determine backers for. If false, don't autodetect. */
	opencollectiveUsername?: string | boolean | null
	/** The ThanksDev GitHub username to determine backers for. If false, don't autodetect. */
	thanksdevGithubUsername?: string | boolean | null
	/** If true, do not fetch any remote data when determing backers. */
	offline?: boolean | null

	/** The minimum amount of monthly cents to be considered a financial donor (only applies if we are aware of the financial amount). */
	sponsorCentsThreshold?: number | null
	/** The minimum amount of eternal cents to be considered a financial donor (only applies if we are aware of the financial amount). */
	donorCentsThreshold?: number | null
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

	/* CSV string of active copyright owners of the project, including years and only the first url */
	author?: string
	/* Eternal authors of the project, including years and description */
	authors?: Array<string>
	/* Active admins/maintainers/publishers of the project */
	maintainers?: Array<string>
	/* Eternal contributors of the project */
	contributors?: Array<string>

	/* Initial financial backers of the project, including description */
	funders?: Array<string>
	/* Active financial backers of the project, including description */
	sponsors?: Array<string>
	/* Eternal financial backers of the project, including description */
	donors?: Array<string>

	/** Badges configuration, see https://github.com/bevry/badges and https://github.com/bevry/projectz */
	badges?: {
		config?: {
			githubSponsorsUsername?: string
			opencollectiveUsername?: string
			thanksdevGithubUsername?: string
		}
	}
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
		console.warn(error.stack)
		return fallback
	}
	try {
		const packageData: PackageData = await resp.json()
		return packageData
	} catch (err: any) {
		const error = new Errlop(`failed to parse package.json of ${slug}`, err)
		if (!fallback) throw error
		console.warn(error.stack)
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
	packageData: Pick<PackageData, 'homepage' | 'repository'>,
): string {
	let url: null | string = null,
		slug: null | string = null
	if (typeof packageData.repository === 'string') {
		url = packageData.repository
	} else if (
		packageData.repository &&
		typeof packageData.repository.url === 'string'
	) {
		url = packageData.repository && packageData.repository.url
	} else if (typeof packageData.homepage === 'string') {
		url = packageData.homepage
	}
	// bevry/projectz
	// github:bevry/projectz
	// https://github.com/bevry/projectz
	// https://github.com/bevry/projectz.git
	// git@github.com:bevry/projectz.git
	if (url) {
		const match = url.match(
			/^(?:https?:\/\/github\.com\/|git@github\.com:|github:)?([^:/]+\/[^:/]+?)(?:\.git)?$/,
		)
		slug = match && match[1]
		if (slug && slug.split('/').filter(Boolean).length !== 2) slug = null
	}
	if (!slug) {
		throw new Errlop({
			code: 'PACKAGE_DATA_NOT_CONFIGURED_FOR_GITHUB_REPOSITORY',
			message: `Could not determine GitHub slug from package data: ${JSON.stringify(
				packageData,
				null,
				'  ',
			)}`,
		})
	}
	return slug
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
		console.warn(error.stack)
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
		console.warn(error.stack)
		return fallback
	}
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
	opts: BackersQueryOptions = {},
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
	opts: BackersQueryOptions = {},
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
// GitHub API

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

export interface GitHubSponsorsBackers {
	sponsors: Array<Fellow>
	donors: Array<Fellow>
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

// ====================================
// GitHub API Methods

/**
 * Get the desired GitHub Access Token from the credentials.
 * You probably want to use {@link fetch} directly, instead of going through this method.
 */
export function getAccessToken(
	credentials: GitHubCredentials = envCredentials,
): string | null {
	return credentials.GITHUB_ACCESS_TOKEN || credentials.GITHUB_TOKEN || null
}

/**  Check whether or not sufficient GitHub credentials were supplied. */
export function hasCredentials(
	credentials: GitHubCredentials = envCredentials,
): boolean {
	const accessToken = getAccessToken(credentials)
	const valid =
		accessToken ||
		(credentials.GITHUB_CLIENT_ID && credentials.GITHUB_CLIENT_SECRET)
	return Boolean(valid)
}

/**
 * Check whether or not sufficient GitHub credentials were supplied.
 * @throws if invalid
 */
export function validateCredentials(
	credentials: GitHubCredentials = envCredentials,
): true {
	if (hasCredentials(credentials)) return true
	throw new Errlop({
		code: 'INVALID_GITHUB_AUTH',
		message:
			'Insufficient GitHub credentials: provide `GITHUB_ACCESS_TOKEN` or `GITHUB_TOKEN`, or a combination of `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`',
	})
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
	validateCredentials(credentials)
	const accessToken = getAccessToken(credentials)
	if (accessToken) {
		params.set('access_token', accessToken)
	} else if (credentials.GITHUB_CLIENT_ID && credentials.GITHUB_CLIENT_SECRET) {
		params.set('client_id', credentials.GITHUB_CLIENT_ID)
		params.set('client_secret', credentials.GITHUB_CLIENT_SECRET)
	} else {
		throw new Errlop({
			code: 'INVALID_STATE',
			message:
				'validateCredentails failed to determine invalid GitHub Credentials',
		})
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
 * Redact any GitHub Credentials in their URLSearchParams from a string.
 * You probably want to use {@link fetch} directly, instead of going through this method.
 * @param value The string to redact credentials from.
 * @returns The string with the credentials redacted.
 */
export function redactSearchParams(value: string): string {
	return value.replace(
		/(&?)(access_token|client_id|client_secret)=\w+/gi,
		'$1$2=REDACTED',
	)
}

/** Redact the GitHub Credentials in any form from a string */
export function redactCredentials(
	value: string,
	credentials: GitHubCredentials = envCredentials,
): string {
	value = redactSearchParams(value)
	let cred: any = getAccessToken(credentials)
	if (cred) value = value.replaceAll(cred, 'REDACTED')
	cred = credentials.GITHUB_CLIENT_ID
	if (cred) value = value.replaceAll(cred, 'REDACTED')
	cred = credentials.GITHUB_CLIENT_SECRET
	if (cred) value = value.replaceAll(cred, 'REDACTED')
	return value
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
	validateCredentials(credentials)
	const accessToken = getAccessToken(credentials)
	if (accessToken) {
		return `token ${accessToken}`
	} else if (credentials.GITHUB_CLIENT_ID && credentials.GITHUB_CLIENT_SECRET) {
		return `Basic ${credentials.GITHUB_CLIENT_ID}:${credentials.GITHUB_CLIENT_SECRET}`
	} else {
		throw new Errlop({
			code: 'INVALID_STATE',
			message:
				'validateCredentails failed to determine invalid GitHub Credentials',
		})
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
	opts: BackersQueryOptions = {},
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
	opts: BackersQueryOptions = {},
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

/** Get a Fellow of a GitHub Sponsors member */
export function getGitHubSponsorsProfile(
	githubProfile: GitHubSponsorGraphQL,
): Fellow {
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
	opts: BackersQueryOptions = {},
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
	opts: BackersQueryOptions = {},
): Promise<Array<Fellow>> {
	const lists = await Promise.all(
		orgs.map((org) => getGitHubMembersFromOrganization(org, opts)),
	)
	return flatten(lists)
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
		for (const author of result.author) author.authorOfRepositories.add(slug)
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

/** Verify URLs of backers to ensure we aren't putting bad data */
async function verifyUrlsOfBackers(source: Partial<Backers>) {
	for (const field of backerFields) {
		const list = source[field]
		if (list) await Promise.all(list.map((fellow) => fellow.verifyUrls()))
	}
	return source
}

/** Process latest backers from a GitHub repository, fetching remote data */
export async function getBackers(
	opts: BackersQueryOptions = {},
): Promise<Backers> {
	let githubSlug: string =
			(typeof opts.githubSlug === 'string' && opts.githubSlug) || '',
		packageData: PackageData =
			(opts.packageData &&
				typeof opts.packageData === 'object' &&
				opts.packageData) ||
			{}
	try {
		// if slug, fetch remote packageData, if packageData, extract slug
		if (githubSlug && opts.packageData == null && opts.offline !== true) {
			// fetch packageData from slug
			packageData = await getPackageData(githubSlug, {})
		}
		if (opts.githubSlug == null && packageData) {
			// extract slug from packagedata, will throw if could not be determined
			try {
				githubSlug = getGitHubSlugFromPackageData(packageData)
			} catch (error) {
				// ignore
			}
		}

		// prepare
		const authed = hasCredentials(opts.credentials)
		if (!authed && opts.offline !== true) {
			console.warn(
				'GitHub credentials not provided, will skip fetching GitHub Contributors, Sponsors, and Profiles',
			)
		}
		let fundingData: FundingData
		const fallbackUsername = githubSlug && githubSlug.split('/')[0]

		// get badge only usernames
		const thanksdevGithubUsername: string =
			opts.thanksdevGithubUsername === false
				? ''
				: (typeof opts.thanksdevGithubUsername === 'string' &&
						opts.thanksdevGithubUsername) ||
					packageData.badges?.config?.thanksdevGithubUsername ||
					fallbackUsername

		// get badge or funding usernames
		let githubSponsorsUsername: string =
			opts.githubSponsorsUsername === false
				? ''
				: (typeof opts.githubSponsorsUsername === 'string' &&
						opts.githubSponsorsUsername) ||
					packageData.badges?.config?.githubSponsorsUsername ||
					''
		let opencollectiveUsername: string =
			opts.opencollectiveUsername === false
				? ''
				: (typeof opts.opencollectiveUsername === 'string' &&
						opts.opencollectiveUsername) ||
					packageData.badges?.config?.opencollectiveUsername ||
					''
		if (
			opts.offline !== true &&
			(!githubSponsorsUsername || !opencollectiveUsername)
		) {
			fundingData = await getFundingData(githubSlug, {})
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

		// prepare backers from package data
		const result = attachBackersToGitHubSlug(
			{
				author: Fellow.add(packageData.author),
				authors: Fellow.add(packageData.author, packageData.authors),
				maintainers: Fellow.add(packageData.maintainers),
				contributors: Fellow.add(
					packageData.maintainers,
					packageData.contributors,
				),
				funders: Fellow.add(packageData.funders),
				sponsors: Fellow.add(packageData.sponsors),
				donors: Fellow.add(
					packageData.funders,
					packageData.sponsors,
					packageData.donors,
				),
			},
			githubSlug,
		)

		// add contributors
		if (authed && opts.offline !== true) {
			try {
				const fetchedContributors = await getGitHubContributors(
					githubSlug,
					opts,
				)
				append(result.contributors, fetchedContributors)
			} catch (err: any) {
				console.warn(err.stack)
			}
		}

		// order by least details, to most accurate details, so ThanksDev, OpenCollective, GitHub Sponsors

		// ThanksDev
		if (thanksdevGithubUsername && opts.offline !== true) {
			try {
				const fetchedBackers = await getBackersFromThanksDev(
					ThanksDevPlatform.GitHub,
					thanksdevGithubUsername,
					opts,
				)
				appendBackers(result, fetchedBackers)
			} catch (err: any) {
				console.warn(err.stack)
			}
		} else {
			console.warn(`Unable to determine ThanksDev username for ${githubSlug}`)
		}

		// OpenCollective
		if (opencollectiveUsername && opts.offline !== true) {
			try {
				const fetchedBackers = await getBackersFromOpenCollective(
					opencollectiveUsername,
					opts,
				)
				appendBackers(result, fetchedBackers)
			} catch (err: any) {
				console.warn(err.stack)
			}
		} else {
			console.warn(
				`Unable to determine OpenCollective username for ${githubSlug}`,
			)
		}

		// GitHubSponsors
		if (authed && opts.offline !== true) {
			if (githubSponsorsUsername) {
				try {
					const fetchedBackers = await getBackersFromGitHubSponsors(
						githubSponsorsUsername,
						opts,
					)
					appendBackers(result, fetchedBackers)
				} catch (err: any) {
					console.warn(err.stack)
				}
			} else {
				console.warn(
					`Unable to determine GitHub Sponsors username for ${githubSlug}`,
				)
			}
		}

		// fetch additional details, if able
		if (authed && opts.offline !== true) {
			await Promise.all(
				Array.from(result.donors).map(async (fellow) => {
					if (fellow.githubUsername && !fellow.githubProfile) {
						await getGitHubProfile(fellow.githubUsername, opts)
					}
				}),
			)
		}

		// verify their details
		if (opts.offline !== false) verifyUrlsOfBackers(result)

		// attach to slug, which enables us to remove duplicates by fetching by slug
		// (duplicates can occur if new details allowed us to merge two old entries)
		attachBackersToGitHubSlug(result, githubSlug)
		return {
			author: result.author,
			authors: Fellow.authorsOfRepository(githubSlug),
			maintainers: Fellow.maintainersOfRepository(githubSlug),
			contributors: Fellow.contributorsOfRepository(githubSlug),
			funders: Fellow.fundersOfRepository(githubSlug),
			sponsors: Fellow.sponsorsOfRepository(githubSlug),
			donors: Fellow.donorsOfRepository(githubSlug),
		}
	} catch (err) {
		const error = new Errlop(
			githubSlug
				? `Failed to fetch backers for GitHub Repository: ${githubSlug}`
				: `Failed to fetch backers for: ${JSON.stringify(opts, null, '  ')}`,
			err,
		)
		console.warn(error.stack)
		return {
			author: [],
			authors: [],
			maintainers: [],
			contributors: [],
			funders: [],
			sponsors: [],
			donors: [],
		}
	}
}

/** Fetch backers from GitHub repository slugs */
export async function getBackersFromRepositories(
	slugs: Array<string>,
	opts: BackersQueryOptions = {},
): Promise<Backers> {
	const results = await Promise.all(
		slugs.map((githubSlug) => getBackers({ ...opts, githubSlug })),
	)

	// flattern and de-duplicate across repos
	const author = new Set<Fellow>()
	const authors = new Set<Fellow>()
	const maintainers = new Set<Fellow>()
	const contributors = new Set<Fellow>()
	const funders = new Set<Fellow>()
	const sponsors = new Set<Fellow>()
	const donors = new Set<Fellow>()
	for (const result of results) {
		append(author, result.author)
		append(authors, result.authors)
		append(maintainers, result.maintainers)
		append(contributors, result.contributors)
		append(funders, result.funders)
		append(sponsors, result.sponsors)
		append(donors, result.donors)
	}

	return {
		author: Fellow.sort(author),
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
	opts: BackersQueryOptions = {},
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
	opts: BackersQueryOptions = {},
): Promise<Backers> {
	const repos = await getGitHubRepositoriesFromSearch(query, opts)

	// Just grab the slugs
	const slugs = repos.map((repo) => repo.full_name)

	// Fetch the backers for the repos
	return getBackersFromRepositories(slugs, opts)
}

export function renderBackers<T extends BackersRenderFormat>(
	backers: Partial<Backers>,
	opts: BackersRenderOptions & { format?: undefined | null },
): never
export function renderBackers<T extends BackersRenderFormat>(
	backers: Partial<Backers>,
	opts: BackersRenderOptions & { format: T },
): BackersRenderResult[T]
export function renderBackers(
	backers: Partial<Backers>,
	opts: BackersRenderOptions,
): any {
	// prepare
	const githubSlug =
		opts.githubSlug === false
			? ''
			: (typeof opts.githubSlug === 'string' && opts.githubSlug) ||
				(opts.packageData && getGitHubSlugFromPackageData(opts.packageData)) ||
				''
	const projectName =
		opts.projectName === false
			? ''
			: (typeof opts.projectName === 'string' && opts.projectName) ||
				opts.packageData?.title ||
				opts.packageData?.name ||
				''
	// render
	if (
		opts.format === BackersRenderFormat.string ||
		opts.format === BackersRenderFormat.text ||
		opts.format === BackersRenderFormat.markdown ||
		opts.format === BackersRenderFormat.html
	) {
		const author =
			backers.author?.map((fellow) =>
				fellow.toFormat({
					displayYears: true,
					...opts,
					displayDescription: false, // override
					githubSlug,
					format: opts.format as any as FellowFormat,
				}),
			) || null
		return trimEmptyKeys({
			author:
				opts.format === BackersRenderFormat.string
					? author?.join(', ')
					: author,
			authors:
				backers.authors?.map((fellow) =>
					fellow.toFormat({
						displayYears: true,
						displayDescription: true,
						...opts,
						githubSlug,
						format: opts.format as any as FellowFormat,
					}),
				) || null,
			maintainers:
				backers.maintainers?.map((fellow) =>
					fellow.toFormat({
						displayDescription: true,
						urlFields:
							opts.format === BackersRenderFormat.string
								? []
								: ['githubUrl', 'url'],
						...opts,
						githubSlug,
						format: opts.format as any as FellowFormat,
					}),
				) || null,
			contributors:
				backers.contributors?.map((fellow) =>
					fellow.toFormat({
						displayContributions: true,
						urlFields:
							opts.format === BackersRenderFormat.string
								? []
								: ['githubUrl', 'url'],
						...opts,
						githubSlug,
						format: opts.format as any as FellowFormat,
					}),
				) || null,
			funders:
				backers.funders?.map((fellow) =>
					fellow.toFormat({
						displayDescription: true,
						...opts,
						githubSlug,
						format: opts.format as any as FellowFormat,
					}),
				) || null,
			sponsors:
				backers.sponsors?.map((fellow) =>
					fellow.toFormat({
						displayDescription: true,
						...opts,
						githubSlug,
						format: opts.format as any as FellowFormat,
					}),
				) || null,
			donors:
				backers.donors?.map((fellow) =>
					fellow.toFormat({
						...opts,
						githubSlug,
						format: opts.format as any as FellowFormat,
					}),
				) || null,
		} as BackersRenderResult[typeof opts.format])
	} else if (opts.format === BackersRenderFormat.package) {
		return trimEmptyKeys(
			arrangePackageData({
				...(opts.packageData || {}),
				...renderBackers(backers, {
					...opts,
					githubSlug,
					format: BackersRenderFormat.string,
				}),
			} as BackersRenderResult[BackersRenderFormat.package]),
		)
	} else if (opts.format === BackersRenderFormat.copyright) {
		return trimEmptyKeys({
			author:
				backers.author?.map((fellow) =>
					fellow.toMarkdown({
						displayCopyright: true,
						displayYears: true,
						...opts,
						githubSlug,
						format: FellowFormat.html,
					}),
				) || null,
			authors:
				backers.authors?.map((fellow) =>
					fellow.toMarkdown({
						displayCopyright: true,
						displayYears: true,
						...opts,
						githubSlug,
						format: FellowFormat.html,
					}),
				) || null,
		} as BackersRenderResult[BackersRenderFormat.copyright])
	} else if (opts.format === BackersRenderFormat.shoutout) {
		const projectNameAndSpace = projectName ? projectName + ' ' : ''
		return [
			...(backers.contributors || []).map(
				(fellow) =>
					`Thank you to ${projectNameAndSpace}contributor 🤍 ${fellow.toText({
						...opts,
						githubSlug,
						format: FellowFormat.text,
					})}`,
			),
			...(backers.funders || []).map(
				(fellow) =>
					`Thank you to ${projectNameAndSpace}funder 🤍 ${fellow.toText({
						...opts,
						githubSlug,
						format: FellowFormat.text,
					})}`,
			),
			...(backers.sponsors || []).map(
				(fellow) =>
					`Thank you to ${projectNameAndSpace}sponsor 🤍 ${fellow.toText({
						...opts,
						githubSlug,
						format: FellowFormat.text,
					})}`,
			),
		].join('\n') as BackersRenderResult[BackersRenderFormat.shoutout]
	} else if (opts.format === BackersRenderFormat.update) {
		return (backers.sponsors || []).length === 0
			? ''
			: (('- Thank you to the sponsors: ' +
					backers.sponsors
						?.map((fellow) =>
							fellow.toMarkdown({
								...opts,
								githubSlug,
								format: FellowFormat.markdown,
							}),
						)
						.join(', ')) as BackersRenderResult[BackersRenderFormat.update])
	} else if (opts.format === BackersRenderFormat.release) {
		return [
			(backers.funders || []).length === 0
				? ''
				: '- Thank you to the funders: ' +
					backers.funders
						?.map((fellow) =>
							fellow.toMarkdown({
								...opts,
								githubSlug,
								format: FellowFormat.markdown,
							}),
						)
						.join(', '),
			(backers.sponsors || []).length === 0
				? ''
				: '- Thank you to the sponsors: ' +
					backers.sponsors
						?.map((fellow) =>
							fellow.toMarkdown({
								...opts,
								githubSlug,
								format: FellowFormat.markdown,
							}),
						)
						.join(', '),
		]
			.filter(Boolean)
			.join('\n') as BackersRenderResult[BackersRenderFormat.release]
	} else {
		throw new Error(`Invalid format: ${opts.format}`)
	}
}
