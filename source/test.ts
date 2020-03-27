import { equal, errorEqual } from 'assert-helpers'
import kava from 'kava'
import fetch from 'cross-fetch'
import {
	githubQueryString,
	githubAuthorizationHeader,
	redact,
	GitHubCredentials,
} from './index.js'
const ghapi = process.env.GITHUB_API || 'https://api.github.com'
console.log(ghapi)

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
	suite('query', function (suite, test) {
		fixtures.forEach(function ({ input, output, error }, index) {
			test(`test ${index}`, function () {
				try {
					equal(githubQueryString(input), output)
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
				equal(redact(input), output)
			})
		})
	})

	suite('manual', function (suite, test) {
		test('header', function (done) {
			fetch(`${ghapi}/rate_limit`, {
				headers: {
					Accept: 'application/vnd.github.v3+json',
					Authorization: githubAuthorizationHeader(),
				},
			})
				.then((res) => res.json())
				.then((result) => console.log(result))
				.then((result) => done())
				.catch(done)
		})

		test('header', function (done) {
			fetch(`${ghapi}/user`, {
				headers: {
					Accept: 'application/vnd.github.v3+json',
					Authorization: githubAuthorizationHeader(),
				},
			})
				.then((res) => res.json())
				.then((result) => console.log(result))
				.then((result) => done())
				.catch(done)
		})

		test('query', function (done) {
			fetch(`${ghapi}/user?${githubQueryString()}`, {
				headers: {
					Accept: 'application/vnd.github.v3+json',
				},
			})
				.then((res) => res.json())
				.then((result) => console.log(result))
				.then(() => done())
				.catch((err: Error) => done(new Error(redact(err.toString()))))
		})
	})
})
