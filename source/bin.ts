// builtin
import { execSync } from 'node:child_process'
import { argv } from 'node:process'

// external
import { writeJSON, readJSON } from '@bevry/json'
import { isReadable } from '@bevry/fs-readable'
import writeFile from '@bevry/fs-write'

// local
import {
	Backers,
	getBackers,
	renderBackers,
	BackersRenderOptions,
	BackersQueryOptions,
	PackageData,
	getGitHubSlugFromUrl,
	getPackageData,
	getGitHubSlugFromPackageData,
	BackersRenderFormat,
} from './index.js'

// cli
import Argument from '@bevry/argument'
const help = `
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

	--githubSponsorsUsername=<string>
	  Instead of autodetecting, use this username for fetching backers from GitHub Sponsors

	--opencollectiveUsername=<string>
	  Instead of autodetecting, use this username for fetching backers from OpenCollective

	--thanksdevGithubUsername=<string>
	  Instead of autodetecting, use this username for fetching backers from ThanksDev

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
	  Valid formats: string, text, markdown, html, package, copyright, shoutout, release, update`

// arguments
interface CliBackersRenderOptions extends BackersRenderOptions {
	writePath?: string | boolean | null
}
interface CliBackersQueryOptions extends BackersQueryOptions {
	packagePath?: string | boolean | null
}
let result: Backers | null = null
let renderOptions: CliBackersRenderOptions = {
	writePath: false,
}
const queryOptions: CliBackersQueryOptions = {
	githubSlug: null,
	packagePath: null,
	packageData: null,
	offline: false,
	githubSponsorsUsername: null,
	opencollectiveUsername: null,
	thanksdevGithubUsername: null,
	sponsorCentsThreshold: 100,
	donorCentsThreshold: 100,
}
function auto(value: any) {
	return value == null || value === true
}
async function action() {
	// query
	if (auto(queryOptions.githubSlug)) {
		queryOptions.githubSlug =
			getGitHubSlugFromUrl(execSync('git remote get-url origin').toString()) ||
			null
	}
	if (auto(queryOptions.packagePath)) {
		if (await isReadable('package.json')) {
			queryOptions.packagePath = 'package.json'
			queryOptions.packageData = (await readJSON(
				queryOptions.packagePath,
			)) as PackageData
		} else if (
			queryOptions.githubSlug &&
			typeof queryOptions.githubSlug === 'string'
		) {
			queryOptions.packageData = await getPackageData(queryOptions.githubSlug)
			queryOptions.packagePath = 'package.json'
		}
	}
	if (
		auto(queryOptions.githubSlug) &&
		queryOptions.packageData &&
		typeof queryOptions.packageData === 'object'
	) {
		queryOptions.githubSlug = getGitHubSlugFromPackageData(
			queryOptions.packageData,
		)
	}
	// fetch
	if (!result) result = await getBackers(queryOptions)
	// write
	if (auto(renderOptions.writePath)) {
		renderOptions.writePath = queryOptions.packagePath || 'package.json'
	}
	if (
		queryOptions.packageData &&
		typeof queryOptions.packageData === 'object'
	) {
		renderOptions.packageData = queryOptions.packageData
	}
	if (auto(renderOptions.format)) {
		if (typeof renderOptions.writePath === 'string') {
			if (renderOptions.writePath.endsWith('package.json'))
				renderOptions.format = BackersRenderFormat.package
			else if (
				renderOptions.writePath.endsWith('shoutout.txt') ||
				renderOptions.writePath.endsWith('shoutouts.txt')
			)
				renderOptions.format = BackersRenderFormat.shoutout
			else if (renderOptions.writePath.endsWith('.json'))
				renderOptions.format = BackersRenderFormat.string
			else if (renderOptions.writePath.endsWith('.txt'))
				renderOptions.format = BackersRenderFormat.text
			else if (renderOptions.writePath.endsWith('.md'))
				renderOptions.format = BackersRenderFormat.markdown
			else if (renderOptions.writePath.endsWith('.html'))
				renderOptions.format = BackersRenderFormat.html
		}
		if (auto(renderOptions.format))
			renderOptions.format = BackersRenderFormat.string // @todo add a raw mode
	}
	// output
	const output = renderBackers(result, renderOptions as any)
	if (typeof renderOptions.writePath === 'string') {
		if (renderOptions.writePath.endsWith('.json')) {
			if (typeof output === 'string') {
				console.warn(
					`Writing to ${renderOptions.writePath} as string... this is probably not intended, and you'll have to do some post-processing...`,
				)
				await writeFile(renderOptions.writePath, output)
			} else {
				await writeJSON(renderOptions.writePath, output)
			}
		} else if (typeof output === 'string') {
			await writeFile(renderOptions.writePath, output)
		} else {
			console.warn(
				`Writing to ${renderOptions.writePath} as JSON... this is probably not intended, and you'll have to do some post-processing...`,
			)
			await writeJSON(renderOptions.writePath, output)
		}
		console.log(`Wrote to ${renderOptions.writePath}`)
	} else {
		console.log(output)
	}
}
async function parse(args: string[]) {
	for (const arg of args) {
		const a = new Argument(arg)
		switch (a.key) {
			case '--': {
				await action()
				renderOptions = {
					writePath: false,
				}
				break
			}
			case 'help': {
				return Argument.help(help)
			}
			case 'slug': {
				result = null
				queryOptions.packageData = null
				queryOptions.githubSlug = a.string({ enabled: true, disabled: false })
				break
			}
			case 'package': {
				result = null
				queryOptions.packageData = null
				queryOptions.packagePath = a.string({ enabled: true, disabled: false })
				break
			}
			case 'offline': {
				queryOptions.offline = a.boolean()
				break
			}
			case 'githubSponsorsUsername':
			case 'opencollectiveUsername':
			case 'thanksdevGithubUsername': {
				queryOptions[a.key] = a.string({ enabled: true })
				break
			}
			case 'sponsorCentsThreshold':
			case 'donorCentsThreshold': {
				queryOptions[a.key] = a.number()
				break
			}
			case 'write': {
				renderOptions.writePath = a.string({ enabled: true, disabled: false })
				break
			}
			case 'format': {
				renderOptions.format = a.string({ enabled: '' }) as any
				break
			}
			default: {
				return a.unknown()
			}
		}
	}
	await action()
}
parse(argv.slice(2)).catch(Argument.catch(help))
