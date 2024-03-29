// external
import {
	equal,
	errorEqual,
	expectThrowViaFunction,
	gt,
	gte,
} from 'assert-helpers'
import kava, { Test } from 'kava'
import Errlop from 'errlop'

// local
import getGitHubLatestCommit, {
	queryREST,
	getQueryString,
	redactSearchParams,
	getGitHubMembersFromOrganization,
	getGitHubMembersFromOrganizations,
	backerFields,
	GitHubCredentials,
	Backers,
	getBackers,
	getBackersFromUsernames,
	getGitHubRepositories,
	getGitHubRepositoriesFromUsernames,
	getGitHubRepositoriesFromSearch,
	getGitHubSlugFromUrl,
	hasCredentials,
} from './index.js'

type Errback = (error?: Error) => void

interface Fixture {
	name?: string
	input: any
	output?: any
	error?: string
}

const slugFixtures: Array<Fixture> = [
	{
		input: 'bevry/github-api',
		output: 'bevry/github-api',
	},
	{
		input: 'github:bevry/github-api',
		output: 'bevry/github-api',
	},
	{
		name: 'gist failure',
		input: 'gist:11081aaa281',
		output: null,
	},
	{
		name: 'bitbucket failure',
		input: 'bitbucket:bb/repo',
		output: null,
	},
	{
		name: 'gitlab failure',
		input: 'gitlab:gl/repo',
		output: null,
	},
	{
		input: 'git@github.com:bevry/github-api.git',
		output: 'bevry/github-api',
	},
	{
		input: 'https://github.com/bevry/github-api',
		output: 'bevry/github-api',
	},
	{
		input: 'https://github.com/bevry/github-api.git',
		output: 'bevry/github-api',
	},
	{
		input: 'ssh://github.com/bevry/github-api',
		output: 'bevry/github-api',
	},
	{
		input: 'ssh://github.com/bevry/github-api.git',
		output: 'bevry/github-api',
	},
	{
		input: 'git://github.com/bevry/github-api',
		output: 'bevry/github-api',
	},
	{
		input: 'git://github.com/bevry/github-api.git',
		output: 'bevry/github-api',
	},
	{
		input: 'git://github.com/bevry/github-api.git#commit-ish',
		output: 'bevry/github-api',
	},
	{
		input: 'git+https://github.com/bevry/github-api.git',
		output: 'bevry/github-api',
	},
	{
		input: 'git+https://github.com/bevry/github-api.git#commit-ish',
		output: 'bevry/github-api',
	},
	{
		input: 'git+ssh://github.com/bevry/github-api.git',
		output: 'bevry/github-api',
	},
	{
		input: 'git+ssh+https://github.com/bevry/github-api',
		output: 'bevry/github-api',
	},
	{
		input: 'git+ssh+https://github.com/bevry/github-api.git',
		output: 'bevry/github-api',
	},
	{
		input: 'git+ssh+https://github.com/bevry/github-api.git#commit-ish',
		output: 'bevry/github-api',
	},
]
const apiFixtures: Array<Fixture> = [
	{
		input: {
			GITHUB_ACCESS_TOKEN: 'gat',
		},
		output: 'access_token=gat',
	},
	{
		// @ts-ignore deliberately invalid for testing
		input: {
			GITHUB_CLIENT_ID: 'gci',
		},
		error: 'INVALID_GITHUB_AUTH',
	},
	{
		// @ts-ignore deliberately invalid for testing
		input: {
			GITHUB_CLIENT_SECRET: 'gcs',
		},
		error: 'INVALID_GITHUB_AUTH',
	},
	{
		input: {
			GITHUB_CLIENT_ID: 'gci',
			GITHUB_CLIENT_SECRET: 'gcs',
		},
		output: 'client_id=gci&client_secret=gcs',
	},
	{
		input: {} as GitHubCredentials,
		error: 'INVALID_GITHUB_AUTH',
	},
]
const redactFixtures: Array<Fixture> = [
	{
		input: 'url?client_id=9d5&client_secret=fbd58',
		output: 'url?client_id=REDACTED&client_secret=REDACTED',
	},
	{
		input: 'url?client_id=9d5&client_secret=fbd58&blah',
		output: 'url?client_id=REDACTED&client_secret=REDACTED&blah',
	},
	{
		input: 'url?blah&client_id=9d5&client_secret=fbd58&blah',
		output: 'url?blah&client_id=REDACTED&client_secret=REDACTED&blah',
	},
	{
		input: 'url?blah&client_id=9d5&client_secret=fbd58',
		output: 'url?blah&client_id=REDACTED&client_secret=REDACTED',
	},
	{
		input: 'url?access_token=9d5',
		output: 'url?access_token=REDACTED',
	},
	{
		input: 'url?access_token=9d5&blah',
		output: 'url?access_token=REDACTED&blah',
	},
	{
		input: 'url?blah&access_token=9d5',
		output: 'url?blah&access_token=REDACTED',
	},
	{
		input: 'url?blah&access_token=9d5&blah',
		output: 'url?blah&access_token=REDACTED&blah',
	},
]

function testFixtures(fixtures: Array<Fixture>, call: Function, test: Test) {
	for (const [index, { name, input, output, error }] of Object.entries(
		fixtures,
	)) {
		test(
			name || `${JSON.stringify(input)} => ${JSON.stringify(output)}`,
			function () {
				let resultError: any = null
				try {
					const actual = call(input)
					equal(actual, output, 'value was as expected')
				} catch (err) {
					resultError = err
				}
				if (resultError || error)
					errorEqual(resultError, error, 'error was as expected')
			},
		)
	}
}

function checkBackersCallback(
	done: Errback,
	expected: { [key: string]: number },
) {
	return function (result: Backers) {
		for (const field of backerFields) {
			try {
				gte(
					// workaround for author returning CSV string
					typeof result[field] === 'string'
						? (result[field] as any as string).split(', ')
						: result[field].length,
					expected[field],
					`had at least ${expected[field]} ${field}`,
				)
			} catch (err) {
				console.dir(result, { depth: 1 })
				throw new Errlop(err)
			}
		}
		setImmediate(done) // don't wrap done call in this promise
	}
}

kava.suite('@bevry/github-api', function (suite, test) {
	suite('slug', function (suite, test) {
		suite('fixtures', function (suite, test) {
			testFixtures(slugFixtures, getGitHubSlugFromUrl, test)
		})
	})
	suite('fixtures', function (suite, test) {
		testFixtures(apiFixtures, getQueryString, test)
	})
	suite('redact', function (suite, test) {
		testFixtures(redactFixtures, redactSearchParams, test)
	})
	suite('api', function (suite, test) {
		if (!hasCredentials()) {
			console.warn('unable to test API, as github credentials not set')
			return
		}
		test('fetch', function (done) {
			queryREST<any>({
				pathname: `rate_limit`,
			})
				.then((result) => {
					// eslint-disable-next-line no-console
					console.log(result)
					equal(
						result.rate.limit > 60,
						true,
						`the rate limit of ${result.rate.limit} should be more than the free tier of 60`,
					)
					setImmediate(done) // don't wrap done call in this promise
				})
				.catch(done)
		})
		suite('commits', function (suite, test) {
			test('latest', function (done) {
				getGitHubLatestCommit('bevry/github')
					.then(function (result) {
						equal(typeof result, 'string', `${result} was a string`)
						equal(Boolean(result), true, `${result} was truthy`)
						done()
					})
					.catch(done)
			})
		})
		suite('repositories', function (suite, test) {
			test('repos', function (done) {
				getGitHubRepositories(['bevry/github'])
					.then(function (result) {
						equal(Array.isArray(result), true, 'result is array')
						gt(result.length, 0, 'result had items')
						done()
					})
					.catch(done)
			})
			test('users', function (done) {
				getGitHubRepositoriesFromUsernames(['browserstate'])
					.then(function (result) {
						equal(Array.isArray(result), true, 'result is array')
						gt(result.length, 0, 'result had items')
						done()
					})
					.catch(done)
			})
			// note that rate limits are per category, and for searches it is only 10 searches per interval
			// test('search', function (done) {
			// 	getGitHubRepositoriesFromSearch('@bevry-labs language:typescript')
			// 		.then(function (result) {
			// 			equal(Array.isArray(result), true, 'result is array')
			// 			gt(result.length, 0, 'result had items')
			// 			done()
			// 		})
			// 		.catch(done)
			// })
		})
		suite('members', function (suite, test) {
			test('org', function (done) {
				getGitHubMembersFromOrganization('bevry')
					.then((result) => {
						gte(result.length, 2) // balupton, bevryme
						setImmediate(done) // don't wrap done call in this promise
					})
					.catch(done)
			})
			test('orgs', function (done) {
				getGitHubMembersFromOrganizations(['browserstate', 'interconnectapp'])
					.then((result) => {
						gte(result.length, 1)
						setImmediate(done) // don't wrap done call in this promise
					})
					.catch(done)
			})
		})
		suite('backers', function (suite, test) {
			test('github', function (done) {
				getBackers({ githubSlug: 'docpad/docpad' })
					.then(
						checkBackersCallback(done, {
							author: 1,
							authors: 1,
							maintainers: 1,
							contributors: 10,
							sponsors: 3,
							funders: 4,
							donors: 5,
						}),
					)
					.catch(done)
			})
			test('orgs', function (done) {
				getBackersFromUsernames(['bevry-labs'])
					.then(
						checkBackersCallback(done, {
							author: 1,
							authors: 1,
							maintainers: 1,
							contributors: 1,
							sponsors: 3,
							funders: 0,
							donors: 3,
						}),
					)
					.catch(done)
			})
		})
	})
})
