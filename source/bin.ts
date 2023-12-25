// builtin
import { execSync } from 'node:child_process'
import process, { argv } from 'node:process'

// external
import { writeJSON, readJSON } from '@bevry/json'
import { isReadable } from '@bevry/fs-readable'
import writeFile from '@bevry/fs-write'
import arrangePackageData from 'arrange-package-json'

// local
import {
	Backers,
	getBackersFromRepository,
	renderBackers,
	BackersRenderOptions,
	BackersQueryOptions,
	PackageData,
	getGitHubSlugFromUrl,
	getPackageData,
	getGitHubSlugFromPackageData,
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

	--[no-]author[=<boolean>]
	  Whether to display/modify author.

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
	  Whether or not to display a link to the user's contributions`

// arguments
const queryOptions: BackersQueryOptions = {
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
	renderOptions: BackersRenderOptions = {}
function reset() {
	// don't reset slug, package, offline, queryOptions
	write = ''
	renderOptions = {}
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
	if (!renderOptions.format) {
		if (write) {
			if (write === '<auto>') write = pkg || 'package.json'
			if (write.endsWith('package.json')) renderOptions.format = 'package'
			else if (write.endsWith('.json')) renderOptions.format = 'json'
			else if (write.endsWith('.txt')) renderOptions.format = 'text'
			else if (write.endsWith('.md')) renderOptions.format = 'markdown'
			else if (write.endsWith('.html')) renderOptions.format = 'html'
			else renderOptions.format = 'string'
		} else renderOptions.format = 'json'
	}
	if (!result) {
		result = await getBackersFromRepository(packageData || slug, queryOptions)
	}
	// output
	renderOptions.githubRepoSlug = slug || pkgSlug // for markdown rendering
	const output = renderBackers(result, renderOptions, packageData)
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
			case 'help': {
				Argument.help(help)
				return
			}
			case 'offline': {
				offline = a.boolean()
				break
			}
			case 'slug': {
				result = null
				packageData = null
				slug = a.string({ enabled: '<auto>', disabled: '' })
				break
			}
			case 'package': {
				result = null
				packageData = null
				pkg = a.string({ enabled: '<auto>', disabled: '' })
				break
			}
			case 'write': {
				write = a.string({ enabled: '<auto>', disabled: '' })
				break
			}
			// number options
			case 'sponsorCentsThreshold':
			case 'donorCentsThreshold': {
				queryOptions[a.key] = a.number()
				break
			}
			// string format options
			case 'format': {
				renderOptions.format = a.string({ enabled: '' }) as any
				break
			}
			// case 'prefix': {
			// 	renderOptions.prefix = a.string({ enabled: '' })
			// 	break
			// }
			// case 'joinBackers':
			// case 'joinBacker': {
			// 	renderOptions[a.key] = a.string({ enabled: '\n' })
			// 	break
			// }
			// case 'author':
			// case 'authors':
			// case 'maintainers':
			// case 'contributors':
			// case 'sponsors':
			// case 'funders':
			// case 'donors':
			// case 'displayUrl':
			// case 'displayDescription':
			// case 'displayEmail':
			// case 'displayCopyright':
			// case 'displayYears':
			// case 'displayContributions': {
			// 	renderOptions[a.key] = a.boolean()
			// 	break
			// }
			default: {
				a.unknown()
			}
		}
	}
	await action()
}
parse(argv.slice(2)).catch(Argument.catch(help))
