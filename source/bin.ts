// builtin
import { execSync } from 'node:child_process'
import process, { argv, exit } from 'node:process'
process.on('uncaughtException', (error: any) => {
	console.error(error.stack || error.message)
	if (error.code != null) {
		exit(error.code)
	} else {
		exit(1)
	}
})

// external
import { writeJSON, readJSON } from '@bevry/json'
import { isReadable } from '@bevry/fs-readable'
import writeFile from '@bevry/fs-write'

// local
import {
	Backers,
	getBackersFromRepository,
	renderBackers,
	FormatOptions,
	getBackersFromPackageData,
	BackerQueryOptions,
	PackageData,
	getGitHubSlugFromUrl,
	getPackageData,
	getGitHubSlugFromPackageData,
} from './index.js'

class Argument {
	public readonly arg: string
	public readonly key: string
	public readonly value: string | null = null
	public readonly inverted: boolean = false
	public readonly truthy = ['true', '1', 'yes', 'y', 'on']
	public readonly falsey = ['false', '0', 'no', 'n', 'off']

	constructor(arg: string) {
		this.arg = arg
		let key: string,
			value: string | null = null
		if (arg === '--') {
			key = '--'
		} else if (arg.startsWith('--')) {
			const index = arg.indexOf('=')
			if (index === -1) {
				key = arg.substring(2)
			} else {
				key = arg.substring(2, index)
				value = arg.substring(index + 1)
			}
			if (key.startsWith('no-')) {
				key = key.substring(3)
				this.inverted = true
			}
		} else {
			key = ''
			value = arg
		}
		this.key = key
		this.value = value
	}
	string(
		enabled: string | null = null,
		disabled: string | null = null,
	): string {
		if (this.value == null) {
			if (this.inverted) {
				if (disabled == null)
					throw new InputError(
						`Argument ${this.arg} must have a string value, e.g. --${this.key}=string`,
					)
				return disabled
			} else {
				if (enabled == null)
					throw new InputError(
						`Argument ${this.arg} must have a string value, e.g. --${this.key}=string`,
					)
				return enabled
			}
		} else {
			return this.value
		}
	}
	boolean(): boolean {
		if (this.value == null || this.value === '') {
			return !this.inverted
		} else if (this.truthy.includes(this.value)) {
			if (this.inverted) return false
			return true
		} else if (this.falsey.includes(this.value)) {
			if (this.inverted) return true
			return false
		} else {
			throw new InputError(
				`Argument ${this.arg} must have a boolean value, e.g. --${this.key} or --no-${this.key} or --${this.key}=yes`,
			)
		}
	}
	number(): number {
		const number =
			this.value == null || this.value === '' ? NaN : Number(this.value)
		if (isNaN(number))
			throw new InputError(
				`Argument ${this.arg} must have a number value, e.g. --${this.key}=123`,
			)
		return number
	}
}

class InputError extends Error {
	code?: number
	constructor(error?: string) {
		let message = `
			ABOUT:
			Fetch backers (authors, maintainers, contributors, funders, sponsors, donors) and if desired output/write to package.json, json, string, text, markdown, html.

			USAGE:
			github-backers [...options] [-- [...options]]

			OPTIONS:
			--package=<string>
			  The package.json file to retrieve the data for and from.

			--slug=<string>
			  The GitHub Repository slug, defaults to fetching it from <package> or git.
			  This option is not reset with --.

			--[no-]offline[=<boolean>]
			  If provided, skip remote update, and only use the data from <package>

			--sponsorCentsThreshold=<number>
			  The minimum amount of monthly cents to be considered a financial sponsor. Defaults to 100.

			--donorCentsThreshold=<number>
			  The minimum amount of eternal cents to be considered a financial donor. Defaults to 100.

			--
			  Act upon the previously specified options, and reset the following options:

			--write=<string>
			  The path that should be updated. If no path is provided, stdout is used.

			--format=<string>
			  The format of the file that should be updated, defaults to autodetection
			  Valid formats: package, json, string, text, markdown, html

			--joinBackers=<string>
			  The string to join groups of backers by.

			--joinBacker=<string>
			  The string to join individual backers by.

			--[no-]authors[=<boolean>]
			  Whether to display/modify authors.

			--[no-]maintainers[=<boolean>]
			  Whether to display/modify maintainers.

			--[no-]contributors[=<boolean>]
			  Whether to display/modify contributors.

			--[no-]sponsors[=<boolean>]
			  Whether to display/modify sponsors.

			--[no-]funders[=<boolean>]
			  Whether to display/modify funders.

			--[no-]donors[=<boolean>]
			  Whether to display/modify donors.

			--prefix[=<string>]
			  A string to proceed each entry. If just [--prefix] then the default prefixes will be used.

			--[no-]displayUrl[=<boolean>]
			  Whether or not to display {@link Fellow.url}

			--[no-]displayDescription[=<boolean>]
			  Whether or not to display {@link Fellow.description}

			--[no-]displayEmail[=<boolean>]
			  Whether or not to display {@link Fellow.email}

			--[no-]displayCopyright[=<boolean>]
			  Whether or not to display the copright icon

			--[no-]displayYears[=<boolean>]
			  Whether or not to display {@link Fellow.years}

			--[no-]displayContributions[=<boolean>]
			  Whether or not to display a link to the user's contributions
		`.replace(/^\t\t/g, '')
		if (error) message += `\n\nERROR: ${error}`
		super(message)
		this.stack = '' // we don't care about the stack for CLI errors
		process.exitCode = 22 // invalid argument
	}
}

// arguments
const queryOptions: BackerQueryOptions = {
	sponsorCentsThreshold: 100,
	donorCentsThreshold: 100,
}
let result: Backers | null = null,
	offline: boolean = false,
	slug: string = '<auto>',
	pkg: string = '<auto>',
	packageData: PackageData | null = null,
	// resetable:
	write: string = '',
	formatOptions: FormatOptions = {}
function reset() {
	// don't reset slug, package, offline, queryOptions
	write = ''
	formatOptions = {}
}
reset()
async function action() {
	// arguments
	let pkgSlug: string = ''
	if (pkg === '<auto>' && slug === '<auto>') {
		if (await isReadable('package.json')) {
			pkg = 'package.json'
			packageData = (await readJSON(pkg)) as PackageData
			pkgSlug = slug = getGitHubSlugFromPackageData(packageData) || ''
		}
		if (!slug) {
			slug = getGitHubSlugFromUrl(
				execSync('git remote get-url origin').toString(),
			)
		}
		if (!packageData && !offline) {
			pkg = ''
			packageData = await getPackageData(slug)
		}
	} else if (pkg === '<auto>') {
		if (await isReadable('package.json')) {
			pkg = 'package.json'
			packageData = await readJSON(pkg)
		}
		if (!packageData && slug && !offline) {
			pkg = ''
			packageData = await getPackageData(slug)
		}
	} else if (slug === '<auto>') {
		if (pkg) {
			packageData = (await readJSON(pkg)) as PackageData
			pkgSlug = slug = getGitHubSlugFromPackageData(packageData) || ''
		}
	}
	if (pkg && !packageData) {
		packageData = (await readJSON(pkg)) as PackageData
	}
	if (!slug && packageData) {
		pkgSlug = slug = getGitHubSlugFromPackageData(packageData) || ''
	}
	if (!pkgSlug && packageData) {
		pkgSlug = getGitHubSlugFromPackageData(packageData) || ''
	}
	if (slug && pkgSlug && slug !== pkgSlug) {
		console.warn(
			`Slug from the resolved package data ${pkgSlug} is not the same as the slug provided ${slug}, this is unexpected.`,
		)
	}
	if (!formatOptions.format) {
		if (write) {
			if (write === '<auto>') write = pkg || 'package.json'
			if (write.endsWith('package.json')) formatOptions.format = 'package'
			else if (write.endsWith('.json')) formatOptions.format = 'json'
			else if (write.endsWith('.txt')) formatOptions.format = 'text'
			else if (write.endsWith('.md')) formatOptions.format = 'markdown'
			else if (write.endsWith('.html')) formatOptions.format = 'html'
			else formatOptions.format = 'string'
		} else formatOptions.format = 'json'
	}
	if (!result) {
		if (!slug || offline) {
			if (packageData == null) {
				throw new InputError(
					'Inside offlin mode (via --offline or indeterminate --slug), --package must be valid (defaults to package.json).',
				)
			}
			result = getBackersFromPackageData(packageData)
		} else {
			result = await getBackersFromRepository(slug, queryOptions)
		}
	}
	// output
	formatOptions.githubRepoSlug = slug || pkgSlug // for markdown rendering
	const output = renderBackers(result, formatOptions, packageData)
	if (write) {
		if (write.endsWith('.json') || typeof output !== 'string') {
			if (write.endsWith('.json') === false)
				console.warn(
					`Wrote to ${write} as JSON. Specify --join argument to write as text.`,
				)
			await writeJSON(write, output)
		} else await writeFile(write, output)
	} else console.log(output)
}
async function parse(args: string[]) {
	for (const arg of args) {
		const a = new Argument(arg)
		switch (a.key) {
			case '--': {
				await action()
				reset()
				break
			}
			case 'offline': {
				offline = a.boolean()
				break
			}
			case 'slug': {
				result = null
				packageData = null
				slug = a.string('<auto>', '')
				break
			}
			case 'package': {
				result = null
				packageData = null
				pkg = a.string('<auto>', '')
				break
			}
			case 'write': {
				write = a.string('<auto>', '')
				break
			}
			// number options
			case 'sponsorCentsThreshold':
			case 'donorCentsThreshold': {
				queryOptions[a.key] = a.number()
				break
			}
			// string format options
			case 'prefix': {
				formatOptions.prefix = a.string('', null)
				break
			}
			case 'joinBackers':
			case 'joinBacker': {
				formatOptions[a.key] = a.string('\n', null)
				break
			}
			case 'format': {
				formatOptions.format = a.string('', null) as any
				break
			}
			// boolean format options
			case 'author':
			case 'authors': {
				formatOptions.authors = a.boolean()
				break
			}
			case 'maintainers':
			case 'contributors':
			case 'sponsors':
			case 'funders':
			case 'donors':
			case 'displayUrl':
			case 'displayDescription':
			case 'displayEmail':
			case 'displayCopyright':
			case 'displayYears':
			case 'displayContributions': {
				formatOptions[a.key] = a.boolean()
				break
			}
			case '': {
				throw new InputError(`Invalid argument [${arg}]`)
			}
			default: {
				throw new InputError(`Invalid flag [${arg}]`)
			}
		}
	}
	await action()
}
parse(argv.slice(2))
