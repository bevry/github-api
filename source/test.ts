import { equal } from 'assert-helpers'
import kava from 'kava'
import { fetch, redact, GitHubCredentials } from './index.js'

interface Fixture {
	input: GitHubCredentials
	output: string
}

const fixtures: Fixture[] = [
	{
		input: {
			GITHUB_ACCESS_TOKEN: 'gat'
		},
		output: 'access_token=gat'
	},
	{
		// @ts-ignore deliberately invalid for testing
		input: {
			GITHUB_CLIENT_ID: 'gci'
		},
		output: ''
	},
	{
		// @ts-ignore deliberately invalid for testing
		input: {
			GITHUB_CLIENT_SECRET: 'gcs'
		},
		output: ''
	},
	{
		input: {
			GITHUB_CLIENT_ID: 'gci',
			GITHUB_CLIENT_SECRET: 'gcs'
		},
		output: 'client_id=gci&client_secret=gcs'
	},
	{
		input: {} as GitHubCredentials,
		output: ''
	}
]

interface RedactFixture {
	input: string
	output: string
}

const redactFixtures: RedactFixture[] = [
	{
		input: 'url?client_id=9d5&client_secret=fbd58',
		output: 'url?client_id=REDACTED&client_secret=REDACTED'
	},
	{
		input: 'url?client_id=9d5&client_secret=fbd58&blah',
		output: 'url?client_id=REDACTED&client_secret=REDACTED&blah'
	},
	{
		input: 'url?blah&client_id=9d5&client_secret=fbd58&blah',
		output: 'url?blah&client_id=REDACTED&client_secret=REDACTED&blah'
	},
	{
		input: 'url?blah&client_id=9d5&client_secret=fbd58',
		output: 'url?blah&client_id=REDACTED&client_secret=REDACTED'
	},
	{
		input: 'url?access_token=9d5',
		output: 'url?access_token=REDACTED'
	},
	{
		input: 'url?access_token=9d5&blah',
		output: 'url?access_token=REDACTED&blah'
	},
	{
		input: 'url?blah&access_token=9d5',
		output: 'url?blah&access_token=REDACTED'
	},
	{
		input: 'url?blah&access_token=9d5&blah',
		output: 'url?blah&access_token=REDACTED&blah'
	}
]

kava.suite('githubauthquerystring', function(suite, test) {
	suite('manual', function(suite, test) {
		fixtures.forEach(function({ input, output }, index) {
			test(`test ${index}`, function() {
				// @ts-ignore
				equal(fetch(input), output)
			})
		})
	})
	suite('env', function(suite, test) {
		fixtures.forEach(function({ input, output }, index) {
			test(`test ${index}`, function() {
				process.env = input
				equal(fetch(), output)
			})
		})
	})
	suite('redact', function(suite, test) {
		redactFixtures.forEach(function({ input, output }, index) {
			test(`test ${index}`, function() {
				equal(redact(input), output)
			})
		})
	})
})
