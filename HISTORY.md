# History

## v11.4.0 2023 December 30

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)
-   Thank you to the sponsors: [Andrew Nesbitt](https://nesbitt.io), [Balsa](https://balsa.com), [Codecov](https://codecov.io), [Poonacha Medappa](https://poonachamedappa.com), [Rob Morris](https://github.com/Rob-Morris), [Sentry](https://sentry.io), [Syntax](https://syntax.fm)

## v11.3.3 2023 December 28

-   If able to fetch the current contributors, drop non-existent/incorrect contributor data
    -   Closes [issue #275](https://github.com/bevry/github-api/issues/275)
-   Thank you to the sponsors: [Andrew Nesbitt](https://nesbitt.io), [Balsa](https://balsa.com), [Codecov](https://codecov.io/), [Poonacha Medappa](https://poonachamedappa.com), [Rob Morris](https://github.com/Rob-Morris), [Sentry](https://sentry.io), [Syntax](https://syntax.fm)

## v11.3.2 2023 December 28

-   Fixed github-backers CLI creating an incorrect slug (likely a regression in v11.2.0)
-   Better error messages for failed fetching
-   Thank you to the sponsors: [Andrew Nesbitt](https://nesbitt.io), [Balsa](https://balsa.com), [Codecov](https://codecov.io/), [Poonacha Medappa](https://poonachamedappa.com), [Rob Morris](https://github.com/Rob-Morris), [Sentry](https://sentry.io), [Syntax](https://syntax.fm)

## v11.3.1 2023 December 28

-   Fixed a regression in v11.2.0 where `packageData` would always be fetched remotely, now if it is provided, it is respected once again
-   Thank you to the sponsors: [Andrew Nesbitt](https://nesbitt.io), [Balsa](https://balsa.com), [Codecov](https://codecov.io/), [Poonacha Medappa](https://poonachamedappa.com), [Rob Morris](https://github.com/Rob-Morris), [Sentry](https://sentry.io), [Syntax](https://syntax.fm)

## v11.3.0 2023 December 28

-   Default cents thresholds to `100` in the API, rather than just the CLI
-   Don't complain about invalid usernames in offline mode, as usernames aren't used in offline mode
-   Thank you to the sponsors: [Andrew Nesbitt](https://nesbitt.io), [Balsa](https://balsa.com), [Codecov](https://codecov.io/), [Poonacha Medappa](https://poonachamedappa.com), [Rob Morris](https://github.com/Rob-Morris), [Sentry](https://sentry.io), [Syntax](https://syntax.fm)

## v11.2.0 2023 December 28

-   If able to fetch the current sponsors, drop the old sponsors to donors
-   Maintainers should display homepage instead of github url if they have it
-   Add various repository slug and url helper methods
-   Cleanup documentation
-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)
-   Thank you to the sponsors: [Andrew Nesbitt](https://nesbitt.io), [Balsa](https://balsa.com), [Codecov](https://codecov.io/), [Poonacha Medappa](https://poonachamedappa.com), [Rob Morris](https://github.com/Rob-Morris), [Sentry](https://sentry.io), [Syntax](https://syntax.fm)

## v11.1.0 2023 December 28

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)
-   Thank you to the sponsors: [Andrew Nesbitt](https://nesbitt.io), [Balsa](https://balsa.com), [Codecov](https://codecov.io/), [Poonacha Medappa](https://poonachamedappa.com), [Rob Morris](https://github.com/Rob-Morris), [Sentry](https://sentry.io), [Syntax](https://syntax.fm)

## v11.0.0 2023 December 27

-   Rewrote to inline [github-commit](https://github.com/bevry-archive/github-commit), [github-contributors](https://github.com/bevry-archive/github-contributors), [github-members](https://github.com/bevry-archive/github-members), [github-repos](https://github.com/bevry-archive/github-repos), and added CLI to to integrate [update-contributors](https://github.com/bevry-archive/update-contributors) and the unreleased update-sponsors/update-backers/[sponsored](https://github.com/bevry-archive/sponsored)
-   Added methods for fetching backers from a variety of sources, including a `github-backers` CLI for interacting your backers, such as updating your `package.json` with their details: `github-backers --write`
-   `query` renamed to `queryREST` and now handles errors, parsing, and paging directly, and added `queryGraphQL`
-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)
-   Thank you to the funders: [Skunk Team](https://skunk.team)
-   Thank you to the sponsors: [Andrew Nesbitt](https://nesbitt.io), [Balsa](https://balsa.com), [Codecov](https://codecov.io/), [Poonacha Medappa](https://poonachamedappa.com), [Rob Morris](https://github.com/Rob-Morris), [Sentry](https://sentry.io), [Syntax](https://syntax.fm)

## v10.2.0 2023 November 20

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v10.1.0 2023 November 14

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v10.0.0 2023 November 1

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)
-   Updated license from [`MIT`](http://spdx.org/licenses/MIT.html) to [`Artistic-2.0`](http://spdx.org/licenses/Artistic-2.0.html)
-   Minimum required node version changed from `node: >=10` to `node: >=18` to keep up with mandatory ecosystem changes
-   No longer uses `node-fetch`, instead uses the [Node.js `fetch` builtin](https://nodejs.org/api/globals.html#fetch)

## v9.0.0 2021 August 5

-   Renamed from `githubauthreq` to `@bevry/github-api`
-   Renamed `fetch` to `query`, to reflect API differences and now that `query` needs to be awaited
-   `query` now supports a `userAgent` property that you can set to your API client

## v8.0.0 2021 August 4

-   `getURL`, `getCredentialedURL`, and `fetch` now accept a single argument, which is the same as before but now supports `url` and `credentials` properties, and if `credentials` is nullish then it attempts to use the environment variables

## v7.0.0 2021 August 4

-   Rewrote the API, now all you have to do is use its exported `fetch` method in most cases

## v6.4.0 2021 August 4

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v6.3.0 2021 July 30

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v6.2.0 2021 July 29

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v6.1.0 2021 July 28

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v6.0.0 2020 November 12

-   Rewrote the API to support new authorization variables, preferences, and usage

## v5.19.0 2020 October 29

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.18.0 2020 September 4

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.17.0 2020 August 18

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.16.0 2020 August 4

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.15.0 2020 July 22

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.14.1 2020 July 22

-   Fixed `editions` dependency being a dev dependency instead of a standard dependency (regression since v5.13.0)
-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.14.0 2020 July 22

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.13.0 2020 July 21

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.12.0 2020 June 25

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.11.0 2020 June 21

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.10.0 2020 June 21

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.9.0 2020 June 20

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.8.0 2020 June 10

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.7.0 2020 June 10

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.6.0 2020 May 22

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.5.0 2020 May 21

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.4.0 2020 May 21

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.3.0 2020 May 11

-   Add `validate` method
-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.2.0 2020 May 6

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v5.1.1 2020 April 27

-   Correctly move `cross-fetch` from dependency to dev dependency

## v5.1.0 2020 April 27

-   Renamed `githubQueryString` to `getParams` with b/c alias for `githubQueryString`, `fetch`, and `default`
-   Renamed `githubAuthorizationHeader` to `getAuthHeader` with b/c alias for `githubAuthorizationHeader`
-   Renamed `redact` to `redactParams` with b/c alias for `redact`
-   Added new `getHeaders`

## v5.0.0 2020 March 27

-   Updated for [GitHub's new authorization recommendations](https://developer.github.com/changes/2020-02-10-deprecating-auth-through-query-param)
    -   Introduced new `githubAuthorizationHeader` method, and renamed `fetch` to `githubQueryString`, and removed default export
    -   Renamed the package from `githubauthquerystring` to `githubauthreq`
-   Minimum required node version changed from `node: >=8` to `node: >=10` to keep up with mandatory ecosystem changes

## v4.0.0 2020 March 27

-   Fixed for latest TypeScript
-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)
-   <s>Minimum required node version changed from `node: >=8` to `node: >=10` to keep up with mandatory ecosystem changes</s> — not actually applied, will be applied in next major

## v3.0.1 2019 December 18

-   Fixed an error in a `README.md` example

## v3.0.0 2019 December 18

-   Converted from JavaScript to TypeScript
-   Added default export for when the initial enviroment variables are good enough
-   Removed the long-form method names, as [you can rename them yourself](https://github.com/bevry/githubauthquerystring#renaming)
-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v2.3.0 2019 December 9

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v2.2.0 2019 December 1

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v2.1.0 2019 December 1

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v2.0.0 2019 November 18

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)
-   Minimum required node version changed from `node: >=6` to `node: >=8` to keep up with mandatory ecosystem changes

## v1.2.0 2019 November 13

-   Updated dependencies, [base files](https://github.com/bevry/base), and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v1.1.0 2019 November 8

-   Updated [base files](https://github.com/bevry/base) and [editions](https://editions.bevry.me) using [boundation](https://github.com/bevry/boundation)

## v1.0.2 2018 November 15

-   Fixed documentation link

## v1.0.1 2018 November 15

-   Update engines to reflect lack of Node v4 compatibility

## v1.0.0 2018 November 15

-   Initial working version
