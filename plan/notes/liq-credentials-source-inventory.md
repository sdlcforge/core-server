# liq-credentials Source Inventory

## Purpose and scope

Ground-truth census of `@liquid-labs/liq-credentials` as of this plan's authoring pass: every source file, the HTTP route surface, the `app.ext` contract it publishes and reads, the build/test wiring the relocation must keep working, its confirmed npm/`app.ext` consumers, and the pre-existing defects and anomalies this plan documents rather than fixes. The Phase 10 relocation task validates against this census; the Phase 11 verification gate compares `core-server`'s post-absorption state against it.

Everything below was read directly from source at `/Users/zane/playground/liquid-labs/liq-credentials` (`main` at `6ef7645`), not inferred from the wave manifest or from older planning text.

## Package identity

| Field | Value |
|---|---|
| `name` | `@liquid-labs/liq-credentials` |
| `version` | `1.0.0-alpha.4` |
| `description` | `""` (empty string — see [Anomalies and flags](#anomalies-and-flags)) |
| `main` | `dist/liq-credentials.js` |
| `files` | *(absent)* |
| `license` | `UNLICENSED` |
| runtime `dependencies` | `@liquid-labs/http-smart-response` `^1.0.0-alpha.3`, `@liquid-labs/liq-credentials-db` `^1.0.0-alpha.9`, `@liquid-labs/liq-handlers-lib` `^1.0.0-alpha.16` |
| `devDependencies` | `@liquid-labs/catalyst-scripts-node-project` `^1.0.0-alpha.21` |

There is **no `plugable-express.yaml`** in this repository — unlike the sibling donor `liq-controls`, this package declares no plugin-level dependency list. The load-order coupling it nonetheless has is described under [`app.ext` contract](#appext-contract) below.

## File census

The plugin's source roots **directly at `src/`**, not at `src/lib/` — the structural difference from `liq-controls` that makes this donor's relocation a move of the whole `src/` tree rather than of a `src/lib/` subtree.

Seven source files plus one test-data fixture:

| Path | Role |
|---|---|
| `src/index.js` | Build entry point; `export * from './handlers'`, `export * from './setup'`, and `const name = 'core-credentials'` / `const summary = 'Enables and manages credential controls.'` |
| `src/setup.mjs` | The `setup()` hook: creates the creds dir, constructs `CredentialsDB` onto `app.ext.credentialsDB`, registers the `credential` path variable |
| `src/handlers/index.js` | `export * from './credentials'` |
| `src/handlers/credentials/index.js` | Assembles the `handlers` array from `import` and `list` |
| `src/handlers/credentials/import.mjs` | `PUT /credentials/:credential/import` |
| `src/handlers/credentials/list.mjs` | `GET /credentials/list` |
| `src/handlers/credentials/test/list.test.js` | Jest unit test for the `list` handler's `func` |
| `src/handlers/credentials/test/data/creds-db.yaml` | Test-data fixture (two entries: `GITHUB_API`, `GITHUB_SSH`) |

This is the complete handler set: **there is no scoping handler and no rotation handler**, anywhere in the source. `docs/liq-credentials-spec.md`'s [Non-goals](../../docs/liq-credentials-spec.md) section records the same finding. Any older planning text implying otherwise is wrong.

Every import in the tree is either a bare package specifier (`node:path`, `node:fs/promises`, `@liquid-labs/*`) or a relative path within the tree (`./handlers`, `./setup`, `./credentials`, `./import`, `./list`, `../list`). **No import is rooted at `src/`** — so moving the whole subtree as a unit requires no import rewriting.

## Route surface

Two routes, both declared by the handler module's own `path` export (array form) rather than by file position:

| Method | `path` export | Handler file | Parameters |
|---|---|---|---|
| `put` | `['credentials', ':credential', 'import']` | `src/handlers/credentials/import.mjs` | `replace` (bool), `path` (required, single-value), `copyToStorage` (bool) |
| `get` | `['credentials', 'list']` | `src/handlers/credentials/list.mjs` | `verify` (bool) + `commonOutputParams()` |

Because both are **array-style `path` registrations**, `plugable-express`'s command-path registration throws `Non-unique command path: <path>` if the same path is registered twice. Combined with the path variable below, a re-export shim left registered as a live plugin alongside a landed absorption is a hard startup crash — which is why the retirement phase leaves no live shim (a build-entry-point-only re-export inside this package's own `dist` is not a second registration).

## `app.ext` contract

**Published by this plugin (must survive the relocation and the absorption byte-for-byte):**

- `app.ext.credentialsDB` — a `CredentialsDB` instance, set in `src/setup.mjs`. Named on `dev-core-consolidation-contract.md`'s [`app.ext` contract freeze](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#appext-contract-freeze).
- Path variable `credential`, registered via the `registerPathVar` function `plugable-express` passes into `setup()`, with `validationRe: '(?:[A-Z0-9][A-Z0-9_]*)'` and an `optionsFetcher` reading `app.ext.credentialsDB.listSupported()`. `plugable-express` throws `Path variable 'credential' is already registered.` on a duplicate registration.

**Confirmed outside readers of `app.ext.credentialsDB`** (playground-wide grep, excluding `node_modules`, `dist/`, `test-staging/`, and worktree copies):

- `@sdlcforge/dev-core` — `src/projects/setup.mjs`, `src/projects/handlers/releases/_lib/do-github-release.mjs`, `src/projects/handlers/_lib/{archive,rename,destroy}-lib.mjs`.
- `@liquid-labs/liq-integrations-issues-github` — `src/create-or-update-pull-request.mjs`, `src/get-current-integration-user.mjs` (itself the third donor in this same plan-group).

**Read by this plugin:**

- `serverConfigRoot` — read from the `setup()` **argument object**, not from `app.ext` directly (the fix landed in commit `cab8a77`). `plugable-express`'s `src/lib/load-plugins.js` passes `serverConfigRoot: app.ext.serverConfigRoot` into `setup()`, so the two are the same value; the argument form is nonetheless the contract and must not be reverted to a direct `app.ext` read.
- `app.ext.serverConfigRoot` — read at *request* time by `src/handlers/credentials/import.mjs` (only when `copyToStorage === true`). This is a separate, legitimate read: `plugable-express`'s `src/app.js` sets `app.ext.serverConfigRoot` during `appInit`. Not a defect; recorded so the two reads are not "harmonized" during the relocation.
- `app.ext.credentialsDB` — read by both handlers.

**Incidental setup-ordering coupling (not mediated by `dependency-runner`).** `@sdlcforge/dev-core`'s `src/projects/setup.mjs` calls `setupCredentials({ credentialsDB: app.ext.credentialsDB })` at plugin-load time, so it needs this plugin's `setup()` to have already run. Today that ordering falls out of `find-plugins`' alphabetical scan order. Nothing in this plan changes it; `core-server`'s own absorb task (`plan/phase-05-absorb-donor-plugins/002-absorb-liq-credentials.md`, requirement 8) owns asserting it after absorption.

## Build and test wiring

From the root `Makefile` (generated by `@liquid-labs/catalyst-scripts-node-project`):

```makefile
SRC:=src
CATALYST_JS_LIB_SRC_PATH:=$(SRC)
CATALYST_NODE_PROJECT_LIB_ENTRY_POINT=$(CATALYST_JS_LIB_SRC_PATH)/index.js
```

Consequences for the relocation:

- The build entry point is **`src/index.js`** and stays there — this is why the relocation reduces that file to a thin re-export rather than deleting it.
- `CATALYST_JS_LIB_FILES_SRC` is a `find $(CATALYST_JS_LIB_SRC_PATH) …` over all of `src/`, so files moved into `src/credentials/` are still discovered with **no `Makefile` change** (unlike `liq-controls`, whose separate `SCHEMA_SRC` path had to be repointed).
- The test pipeline Babel-transpiles `$(SRC)/%` → `test-staging/%` for both code and data selectors, so `src/credentials/handlers/credentials/test/{list.test.js,data/creds-db.yaml}` lands at `test-staging/credentials/handlers/credentials/test/…` with the test and its fixture keeping the same relative offset from each other. The test's own `import { func } from '../list'` likewise stays valid.

`make build` → `dist/liq-credentials.js`; `make test` → Babel + Jest over `test-staging/`; `make lint` → ESLint, report at `qa/lint.txt`; `make qa` → test + lint. `package.json` wires `preversion` → `make qa` and `prepack` → `make build`.

## Consumer inventory

Playground-wide grep over `package.json` files (excluding `node_modules/`, `dist/`, and worktree copies) finds exactly **one** npm dependent of `@liquid-labs/liq-credentials`:

- `@sdlcforge/core-server` — `package.json` `dependencies`, and entry 2 of the `explicitPlugins` array in `src/lib/app-init.mjs`. It is also named in `core-server`'s `test/test-basic.js` and `test/test-integration-quick.js` expected-plugin lists.

No other package in the playground depends on it. (Distinct from the `app.ext.credentialsDB` readers listed above, which consume the *runtime contract* without declaring an npm dependency on this package.)

## Anomalies and flags

1. **`textFormatter` in `list.mjs` is broken.** `const textFormatter = ({ data: creds, title }) => terminalFormatter(creds, title).replaceAll(...)` calls `terminalFormatter` **positionally**, but `terminalFormatter` destructures a single object (`({ data: creds, title })`). It therefore receives the credentials *array* as its object argument, reads `data` off it as `undefined`, and throws `TypeError: Cannot read properties of undefined (reading 'map')`. Plain-text-format `GET /credentials/list` output cannot work. Pre-existing; document, do not fix (behavior-preserving relocation).

2. **`package.json` `description` is the empty string.** `plugable-express` derives a plugin's server-visible `summary` from the package `description`, so this plugin currently reports an empty summary. The `summary` const exported from `src/index.js` (`'Enables and manages credential controls.'`) is **not** what the loader reads. Phase 11 task 3 replaces `description` with the deprecation notice, which incidentally fixes the emptiness.

3. **No `files` allowlist and `/dist` is gitignored.** With no `files` array and no `.npmignore`, npm falls back to `.gitignore` — which excludes `/dist`. npm force-includes `package.json`, `README.md`, and the file named by `main`, so `dist/liq-credentials.js` still ships, but nothing else under `dist/` (source maps, for instance) does. Phase 11 task 3 must confirm what `npm pack --dry-run` actually produces rather than assume the tarball is complete.

4. **The `src/credentials/handlers/credentials/` nesting is deliberately not collapsed.** `dev-core-consolidation-contract.md`'s [layout convention](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#layout-convention) carries a "one collapse" exception flattening a redundant `handlers/<domain>/` when the submodule directory already carries the domain name — which, read literally, applies to this donor (`src/handlers/credentials/` under submodule `credentials`). This plan does **not** apply it, for three reasons: `core-server`'s own absorb task for this donor prescribes a straight `git mv` of everything under `src/` into `src/credentials/`; applying the collapse would require merging `src/handlers/index.js` into `src/handlers/credentials/index.js`, turning a pure relocation into a content edit; and route paths come from each handler's `path` export, so the nesting is cosmetic. Flagged so a later cosmetic-cleanup decision is a deliberate follow-up rather than a surprise.

5. **The plan branch does not yet carry the relocation, and `core-server` merges the plan branch.** `core-server`'s absorb task verifies and merges `<donor-remote>/plan/core-server-domain-consolidation`, not `main`. As of this authoring, `plan/core-server-domain-consolidation` sits at `e346649` — the merge-base with `main`, predating even the committed `README.md`/`docs/` (commit `6ef7645`). Flow's normal flow lands task work on the working branch, so after Phase 10 completes the relocation will be on `main` while the plan branch still shows the pre-move tree. The Phase 10 task's validation requires confirming the relocation is reachable from whichever branch `core-server` will actually verify; the dispatching manager owns resolving the discrepancy.

## Related documents

- [`plan/overview.md`](../overview.md) — the plan this inventory grounds.
- `docs/liq-credentials-spec.md` — the committed spec documenting this plugin's current behavior (two handlers; no scoping, no rotation).
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the absorption recipe, layout convention, `app.ext` contract freeze, retirement policy, and publishing hygiene rules this plan implements the donor half of.
- `/Users/zane/playground/sdlcforge/core-server/worktrees/plan/core-server-domain-consolidation/plan/phase-05-absorb-donor-plugins/002-absorb-liq-credentials.md` — the fold-in target's own absorb task for this donor.
