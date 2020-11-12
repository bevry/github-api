import { equal, errorEqual } from 'assert-helpers'
import kava from 'kava'
import fetch from 'cross-fetch'
import {
	getQueryString,
	getAuthHeader,
	getApiUrl,
	redactSearchParams,
	GitHubCredentials,
	getHeaders,
	getUrl,
} from './index.js'
import { env } from 'process'
const api = getApiUrl(env as GitHubCredentials)

interface Fixture {
	input: GitHubCredentials
	output?: string
	error?: string
}

const fixtures: Fixture[] = [
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
		error: 'missing',
	},
	{
		// @ts-ignore deliberately invalid for testing
		input: {
			GITHUB_CLIENT_SECRET: 'gcs',
		},
		error: 'missing',
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
		error: 'missing',
	},
]

interface RedactFixture {
	input: string
	output: string
}

const redactFixtures: RedactFixture[] = [
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

kava.suite('githubauthreq', function (suite, test) {
	suite('fixtures', function (suite, test) {
		fixtures.forEach(function ({ input, output, error }, index) {
			test(`test ${index}`, function () {
				try {
					equal(getQueryString(input), output)
				} catch (err) {
					if (!error) throw err
					errorEqual(err, error, 'error was as expected')
				}
			})
		})
	})

	suite('redact', function (suite, test) {
		redactFixtures.forEach(function ({ input, output }, index) {
			test(`test ${index}`, function () {
				equal(redactSearchParams(input), output)
			})
		})
	})

	suite('fetch', function (suite, test) {
		test('rate limit header', function (done) {
			fetch(`${api}/rate_limit`, {
				headers: {
					Accept: 'application/vnd.github.v3+json',
					Authorization: getAuthHeader(env as GitHubCredentials),
				},
			})
				.then((response) => response.json())
				.then((result) => {
					// eslint-disable-next-line no-console
					console.log(result)
					equal(
						result.rate.limit > 60,
						true,
						`the rate limit of ${result.rate.limit} should be more than the free tier of 60`
					)
					done()
				})
				.catch(done)
		})
	})
})
