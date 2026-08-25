# liq-integrations-issues-github

Working notes for developers and AI agents contributing to `liq-integrations-issues-github`. The package is a GitHub-Issues-backed provider plugin for the `liq-integrations` hook-registry mechanism (now built into `@liquid-labs/plugable-express`): it maps that mechanism's abstract `tickets` and `pull request` hooks onto GitHub's Issues, Pull Requests, Projects, and Milestones APIs — pull-request create/update, issue/project URL resolution, current-integration-user lookup, and QA link-file indexing. It is a plugin, not a standalone runnable package; it only functions when loaded by a `plugable-express`-based host server.

## Build and test

```bash
npm install
npm test
```

`npm test` runs `make test`, which Babel-transpiles `src/` into `test-staging/` and runs Jest against the transpiled output (`test-staging/test/`); do not edit files under `test-staging/` directly, they are build output.

```bash
npm run build   # make build — Rollup-bundles src/index.js into dist/liq-integrations-issues-github.js
npm run lint     # make lint — ESLint over src/, excluding dist/, test-staging/, docs/
npm run lint:fix # make lint-fix — ESLint --fix
npm run qa       # make qa — test + lint
```

Build, lint, and test tooling is supplied by the shared `@liquid-labs/catalyst-scripts-node-project` dev dependency (Rollup, Babel, Jest, and ESLint configs referenced from the `Makefile`); this project does not maintain its own tool configs.

## Code organization

- `src/index.js` — thin re-export (`export * from './integrations-issues-github'`); the build entry point, kept so the package stays independently buildable through the interim absorption into `@sdlcforge/core-server`.
- `src/integrations-issues-github/index.js` — the plugin's real entry point; the `setup` function that registers the `tickets` and `pull request` provider entries with the host's `IntegrationsManager`.
- `src/integrations-issues-github/*.mjs` — one file per hook or shared helper, named to match the hook it exports (e.g. `create-or-update-pull-request.mjs` exports `createOrUpdatePullRequest`). `constants.mjs` holds shared constants (`GH_BASE_URL`, `WORKSPACE`).
- `src/integrations-issues-github/uses-github-issues.mjs` — the shared activation test (`usesGitHubIssues`) both provider registrations use.
- `src/integrations-issues-github/test/` — Jest test sources; transpiled into `test-staging/integrations-issues-github/test/` for the actual test run.
- `dist/` — build output (`make build`); not source, do not edit.
- `test-staging/` — Babel build output used only to run tests; not source, do not edit.
- `qa/` — captured `make test` / `make lint` output (`unit-test.txt`, `lint.txt`) and pass markers.

See [docs/project-structure.md](./docs/project-structure.md) for the full repository layout reference, once written.

## Conventions

- Hooks are plain async (or, for the pure URL builders, synchronous) functions exported by name from a dedicated `src/integrations-issues-github/<hook-name>.mjs` file; `src/integrations-issues-github/index.js` only wires hooks into provider registrations, it contains no hook logic itself. `src/index.js` at the repository root is a thin re-export only.
- Every hook that calls the GitHub API retrieves its auth token from the host app's `credentialsDB` under the `GITHUB_API` key (`app.ext.credentialsDB.getToken('GITHUB_API')`); hooks never accept credentials as a parameter.
- Non-critical failures in `createOrUpdatePullRequest` (assignee, milestone, reviewer, or body-update assignment) are caught and reported via the supplied `reporter`, not thrown — the hook still returns the PR URL. Preserve this behavior when touching that hook.
- `determineCurrentMilestone` lives at `src/integrations-issues-github/determine-current-milestone.mjs` as a verbatim copy of the former `@liquid-labs/liq-projects-lib` implementation, deliberately kept unmodified — including its unused `cache` parameter and its construction of a second `Octocache` — so the fold into `@sdlcforge/core-server` absorbs a behavior-identical implementation. If either oddity is to be cleaned up, that is a change to make on its own, after the fold, not incidentally.

## External services and dependencies

- **GitHub REST API**, accessed via `@liquid-labs/octocache`'s cached client, authenticated with the token registered under `GITHUB_API` in the host app's `credentialsDB`.
- `@liquid-labs/git-toolkit` — origin/main resolution and shell push of the work branch.
- `@liquid-labs/github-toolkit` — GitHub login and org/repo resolution from `package.json`.
- `@liquid-labs/liq-qa-lib` — QA file link resolution for `getQALinkFileIndex`.
- `@liquid-labs/shell-toolkit` — shell command execution.
- `@liquid-labs/versioning` — supplies `minVersion`, used by `src/integrations-issues-github/determine-current-milestone.mjs`.
- Requires a `plugable-express`-based host exposing `app.ext.integrations.register`, `app.ext.credentialsDB`, and `app.ext._liqProjects.playgroundMonitor`.

## Documentation

- [README.md](./README.md) — consumer-facing overview and installation/registration instructions.
- [docs/liq-integrations-issues-github-spec.md](./docs/liq-integrations-issues-github-spec.md) — canonical specification of the plugin's hooks, activation test, and cross-cutting behaviors.
- [docs/project-structure.md](./docs/project-structure.md) — repository layout reference, once written.
