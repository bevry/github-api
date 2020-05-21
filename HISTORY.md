# History

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
