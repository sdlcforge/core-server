# Consumer Migration Handoff

## Purpose and scope

This document specifies, for each of the four `@liquid-labs/plugable-express` plugin packages `@sdlcforge/dev-core` supersedes, the exact edits `@sdlcforge/core-server` — the one npm consumer of each — must make to stop loading the standalone package and start getting the same routes and runtime contracts from `@sdlcforge/dev-core` instead. It is a specification, not an execution log: writing an edit down here does not perform it. Executing these edits belongs to `core-server`'s own plan-group; this document exists so that plan-group never has to re-derive facts that are only knowable from `dev-core`'s own source and history.

The [Dev-Core Consolidation Contract](./dev-core-consolidation-contract.md) governs the separate, earlier step of absorbing a package's source into `dev-core`. This document governs the later, independent step of repointing the consumer once an absorption has landed — the two are not the same operation and do not share a timeline.

One section per absorbed package, keyed by submodule short name (`liq-projects`, `liq-orgs`, `liq-work`, `projects-audit`), each added independently as its own handoff is authored. As of this writing all four sections exist — `liq-work`, `liq-projects`, `liq-orgs`, and `projects-audit` — so consumer migration is fully actionable for every donor this document covers.

## Table of contents

1. [Overview](#overview)
   - [How an unsynchronized swap fails](#how-an-unsynchronized-swap-fails)
2. [liq-work](#liq-work)
   - [Edits required in core-server](#edits-required-in-core-server)
   - [Atomicity requirement](#atomicity-requirement)
   - [Provenance change](#provenance-change)
   - [What does not change](#what-does-not-change)
   - [Corrections and disclosures](#corrections-and-disclosures)
   - [Scope of this document](#scope-of-this-document)
3. [liq-projects](#liq-projects)
   - [Edits required in core-server](#edits-required-in-core-server-1)
   - [Atomicity requirement](#atomicity-requirement-1)
   - [Provenance change](#provenance-change-1)
   - [What does not change](#what-does-not-change-1)
   - [Corrections and disclosures](#corrections-and-disclosures-1)
   - [Verification checklist](#verification-checklist)
4. [liq-orgs](#liq-orgs)
   - [Edits required in core-server](#edits-required-in-core-server-2)
   - [Atomicity requirement](#atomicity-requirement-2)
   - [Provenance change](#provenance-change-2)
   - [What does not change](#what-does-not-change-2)
   - [Corrections and disclosures](#corrections-and-disclosures-2)
5. [projects-audit](#projects-audit)
   - [Edits required in core-server](#edits-required-in-core-server-3)
   - [The `http-smart-response` simplification](#the-http-smart-response-simplification)
   - [Atomicity requirement](#atomicity-requirement-3)
   - [Provenance change](#provenance-change-3)
   - [What does not change](#what-does-not-change-3)
   - [Corrections and disclosures](#corrections-and-disclosures-3)

## Overview

Every one of the four packages this document covers is removed from `core-server`'s `explicitPlugins` array and its `package.json` `dependencies` in the same change that adds `@sdlcforge/dev-core` — added once, shared across whichever donor's swap happens to land first, never re-added for the donors that follow. There is no viable intermediate state where a donor package and `@sdlcforge/dev-core` are both loaded at once, and none where neither is loaded: the first strands whichever routes and `app.ext` contract that donor owns, the second crashes the server (see below).

### How an unsynchronized swap fails

Loading a donor package and `@sdlcforge/dev-core` together does not silently shadow routes — it crashes the server at startup. `@liquid-labs/plugable-express`'s plugin loader (`load-plugins.js:29`) invokes each plugin's `setup` eagerly, before any handler registration happens (handler registration is deferred into `app.ext.pendingHandlers` and runs only after every plugin's `setup` has completed). Any path variable a donor registers during `setup` that `@sdlcforge/dev-core` also registers therefore collides, and `registerPathVar` (`plugable-express/src/lib/path-var-registry.mjs:28-34`) throws immediately — before handler registration is even attempted. Had that not fired, the next collision would be a duplicated array-style command path, thrown by `processCommandPath` (`plugable-express/src/lib/register-handlers.js:129-131`) once handler registration does run.

This corrects `dev-core-target-shape.md`'s original wording (decision D10), which assumed a non-atomic swap would silently shadow routes — it does not. The failure is loud and unmissable, which is the practical reason the swap is safe to attempt at all: an operator cannot get it half-right without the server refusing to start. Each donor's own section below names the exact strings its swap produces.

## liq-work

`liq-work` (the `work` submodule) has already landed in `dev-core` as of this writing — the third of the four absorptions to land, after `liq-projects` and `liq-orgs`. That makes this the third swap `core-server`'s own plan-group can actually execute: `core-server`'s own `package.json` and `explicitPlugins` array still carry `@liquid-labs/liq-work`, `@liquid-labs/liq-projects`, and `@liquid-labs/liq-orgs` unswapped as of this writing (re-verified below), so none of the three swaps has landed in `core-server` yet. Whichever of the three executes first performs the one-time `@sdlcforge/dev-core` addition the [Overview](#overview) describes; whichever executes later only removes its own donor entry, exactly as the [liq-projects](#liq-projects) and [liq-orgs](#liq-orgs) sections state for their own cases.

### Edits required in core-server

Re-verified directly against `core-server`'s `main` (commit `54b06d0`, 2026-08-17) while writing this section; every line below matched exactly, with no drift from the original plan reading.

| File | Line | Current | Required edit |
|---|---|---|---|
| `package.json` | 48 | `"@liquid-labs/liq-work": "^1.0.0-alpha.9",` | **Remove.** This is a registry version range, not a `file:.yalc/…` link — unlike `@liquid-labs/liq-projects`, nothing needs `yalc` unlinking; the entry is simply deleted. Add `"@sdlcforge/dev-core": "file:.yalc/@sdlcforge/dev-core"` once, shared with whichever other donor's swap lands in the same commit — do not add it a second time if it is already present. |
| `src/lib/app-init.mjs` | 39 | `'@liquid-labs/liq-work',` inside the `explicitPlugins` array | **Remove.** Add `'@sdlcforge/dev-core'` once, shared with the other donors' entries. |
| `docs/architecture.md` | 23 | Mermaid diagram label: `Tier2["Tier 2: explicit npm-dependency plugins<br/>(13 packages, e.g. liq-controls, liq-work)"]` | **Update** — drop `liq-work` from the example pair (or repoint the example to `dev-core`, once at least one donor has swapped). |
| `docs/architecture.md` | 51 | Prose naming `liq-work` among the explicit-tier package examples | **Update.** |
| `docs/architecture/plugin-loading-tiers.md` | 58 | Row 6 of the explicit-plugin table: `\| 6 \| @liquid-labs/liq-work \| Unit-of-work management — associating projects with units of work and driving QA operations across them. \|` | **Update** — remove the row. Do not add a parallel `dev-core` row per donor; once all four donors have swapped, the table needs a single `dev-core` row replacing all four, a decision for whichever swap lands last. |
| `test/README.md` | 110 | `- \`@liquid-labs/liq-work\`` in the expected-plugin list | **Update** — remove the line. |
| `CLAUDE.md` | 49 | `2. **Explicit Plugins** (installed as npm dependencies): liq-controls, liq-credentials, liq-integrations, liq-projects, liq-work, and various SDLC workflows` | **Update** — drop `liq-work` from the list. |

**No `core-server` test fixture names `liq-work`.** Unlike the `liq-projects` swap, which touches three fixture occurrences (`test/test-basic.js` plus two in `test/test-integration-quick.js`), a search of `core-server`'s `test/` tree for `liq-work` returns only the `test/README.md` line above. A reader who assumes symmetry across the four donors will look for fixtures here that do not exist.

### Atomicity requirement

Remove the `@liquid-labs/liq-work` entry and add the `@sdlcforge/dev-core` entry in the same commit — see [How an unsynchronized swap fails](#how-an-unsynchronized-swap-fails) for why no intermediate state is viable in general. For `liq-work` specifically, loading both packages at once produces, first and loudest:

```text
Path variable 'workKey' is already registered.
```

thrown from `plugable-express/src/lib/path-var-registry.mjs:28-34`. It fires before any handler-level error, because plugin `setup` runs eagerly while handler registration is deferred (see above). Had it not fired, the next error would have been:

```text
Non-unique command path: work/:workKey/build
```

(or whichever `/work` path registers first), thrown from `plugable-express/src/lib/register-handlers.js:129-131`.

Both strings are named here verbatim so the failure is recognizable — and greppable — on sight. This is a **loud** failure, not a silent one.

### Provenance change

Every `/work` endpoint's recorded `npmName` becomes `@sdlcforge/dev-core` instead of `@liquid-labs/liq-work`. `@liquid-labs/plugable-express` takes plugin identity from the package manifest (`package.json`'s `name`/`description`), never from the loaded module's own `name`/`summary` exports — so `liq-work`'s inert module-level `name = 'core-work'` export was never visible to the server to begin with, and this is not a case of a previously-visible identity disappearing. The change is harmless at runtime but **visible** in the server's generated API spec and in `help` output, so `core-server`'s golden-API-spec snapshot must be re-verified after the swap rather than assumed unchanged.

### What does not change

- All **30** `/work` routes keep their exact `path` arrays and methods, including the explicit/implied pairing (e.g. `PUT work/:workKey/build` alongside `PUT work/build`) and both nested `issues`/`projects` sub-collections. `start` and `resume` remain explicit-only — they have no implied/bare-path counterpart, and that does not change either.
- `app.ext.constants.WORK_DB_PATH` keeps its name and its `<serverConfigRoot>/work/work-db.yaml` value, so any `work-db.yaml` already on disk is read by `dev-core` exactly as it was by `liq-work` — no data migration is needed or performed.
- The `workKey` path variable keeps its name, its `validationRe`, and its lazily-invoked `optionsFetcher`.
- `liq-work` has no non-npm consumer reading any `app.ext`-published contract of its own — it only *reads* other plugins' contracts (`app.ext._liqProjects.playgroundMonitor`, `app.ext.credentialsDB`, `app.ext.integrations`) and publishes nothing besides `WORK_DB_PATH`. Nothing outside `core-server` needs any change for this swap.

### Corrections and disclosures

#### Correction: the `golden-api-spec.test.js` `serverHome` comment is stale for `liq-work`

`src/lib/test/golden-api-spec.test.js:44` carries a comment naming `liq-work` among the packages that "still read `app.ext.serverHome`". **`liq-work` does not.** A search of `liq-work`'s source for `serverHome` returns nothing, and its `setup.mjs:6` reads `app.ext.serverConfigRoot`. `liq-work` was migrated off `serverHome` by an earlier plan and the comment was never updated to reflect it. Do not spend executor time chasing this as part of the swap, and do not "fix" `liq-work`'s (or `dev-core`'s) working code on the mistaken belief that it is the source of the comment's complaint.

#### Disclosure: `liq-work`'s built bundle cannot be `require`d on Node ≥ 24

`@liquid-labs/liq-work`'s built bundle cannot be `require`d on Node ≥ 24: `buffer-equal-constant-time` dereferences `SlowBuffer`, which was removed from `node:buffer` in Node 24. The chain is `liq-work` → `@liquid-labs/github-toolkit` → `@liquid-labs/octocache` → `octokit` → `@octokit/auth-app` → `jsonwebtoken` → `jws` → `jwa` → `buffer-equal-constant-time`. This is **pre-existing, environment-wide, and inherited by `dev-core`** once the `work` submodule lands there — it already affects the `projects` submodule today, through the same `github-toolkit` dependency. It is not caused by this consolidation and is not fixed by it.

This changes what "the swap worked" can even mean: on Node ≥ 24 the explicit-plugin set does not fully load either before or after the swap, so a plain startup smoke test cannot serve as the acceptance criterion. `core-server`'s own follow-ups `ynGa`, `26sW`, and `HHGR` record the same *category* of startup-blocking defect — a plugin dereferencing a property `@liquid-labs/plugable-express` no longer sets (`app.ext.serverHome` or `app.ext.pathResolvers`) — but this defect is distinct from all three (`SlowBuffer`, not `serverHome`/`pathResolvers`) and should not be folded into or confused with them.

Use this positive check instead: on a Node version where the full explicit-plugin set can load, the plugin registers without error, and all 30 `/work` routes appear in the generated API spec under `@sdlcforge/dev-core`.

### Scope of this document

This section specifies edits; it does not make them. The owning plan-group for the actual `core-server` edits is `core-server-domain-consolidation`. The four donors' entries should be executed **together**, as one atomic swap of four `explicitPlugins` entries for a single `@sdlcforge/dev-core` entry, rather than as four separate changes — because the intermediate states are exactly the crashing configurations [Atomicity requirement](#atomicity-requirement) describes.

## liq-projects

`liq-projects` (the `projects` submodule) has already landed in `dev-core` as of this writing — it is the first of the four absorptions to land, and none of the other three has swapped yet. That makes this the first (and, today, the only) swap `core-server`'s own plan-group can actually execute: adding `@sdlcforge/dev-core` to `core-server` here is the one-time addition the [Overview](#overview) describes, shared by whichever of `liq-work`, `liq-orgs`, or `plugable-projects-audit` swaps next — those later swaps only remove their own donor entry, they do not re-add `@sdlcforge/dev-core`.

### Edits required in core-server

Re-verified directly against `core-server`'s `main` (commit `54b06d0`, 2026-08-17) while writing this section; every line below matched exactly.

| File | Line | Current | Required edit |
|---|---|---|---|
| `package.json` | 47 | `"@liquid-labs/liq-projects": "file:.yalc/@liquid-labs/liq-projects",` | **Remove.** Add `"@sdlcforge/dev-core"` in its place. Two consumption forms exist — a registry range (once published, e.g. `^1.0.0-alpha.0`) or a local `yalc` link (`file:.yalc/@sdlcforge/dev-core`) — and the `yalc` form is recommended for the transition: it is how `core-server` already consumes this same package (as `liq-projects`) and `@liquid-labs/plugable-express` (`package.json` line 49, `"file:.yalc/@liquid-labs/plugable-express"`). The sequence is `yalc publish` from the `dev-core` checkout, then `yalc add @sdlcforge/dev-core` from `core-server`, which writes the `file:.yalc/@sdlcforge/dev-core` entry. `.yalc/` is gitignored in `core-server` (`.gitignore` lines 3 and 8, `/.yalc` and `/yalc.lock`), so a fresh worktree has neither and needs provisioning before install — `core-server` already has a script for exactly this, `scripts/provision-local-deps.sh`, which copies `.yalc/` in from the main checkout and then installs. That script's own `REQUIRED_YALC_PACKAGES` array hardcodes `@liquid-labs/liq-projects` as one of the packages it verifies is present under `.yalc/`; this swap must also update that array to `@sdlcforge/dev-core`, or the script will report a missing package that no longer needs linking. |
| `src/lib/app-init.mjs` | 38 | `'@liquid-labs/liq-projects',` inside the `explicitPlugins` array (lines 33–45) | **Remove.** Add `'@sdlcforge/dev-core'` once, shared with whichever other donor's swap lands in the same commit — do not add it a second time if it is already present. The array is otherwise alphabetically ordered and the new entry sorts differently (`@sdlcforge/...` sorts after every `@liquid-labs/...` entry, so it belongs at the end of the array), which is cosmetic but worth doing deliberately rather than dropping it in place of the removed `liq-projects` line. |
| `test/test-basic.js` | 54 | `'@liquid-labs/liq-projects'`, one entry in the `expectedPackages` array (lines 50–54) | **Update** — replace with `'@sdlcforge/dev-core'`. |
| `test/test-integration-quick.js` | 61 and 87 | `'@liquid-labs/liq-projects'`, one entry in each of two separate `explicitPlugins` array literals (the JSON-parse path and the non-JSON fallback path) | **Update both** — replace with `'@sdlcforge/dev-core'`. |
| `test/__snapshots__/golden-api-spec.json` and `test/__snapshots__/golden-plugins-list.json` | — | Re-verify rather than assume. As observed today, `golden-plugins-list.json` is literally `[]` and every `npmName` in `golden-api-spec.json` is `@liquid-labs/plugable-express` — the golden fixtures are captured with no explicit plugins loaded at all, so this swap is unlikely to move either file. If it does move them, the change is provenance-only and legitimate. `core-server`'s own `npm run test:update-golden-api-spec` (`UPDATE_GOLDEN_API_SPEC=true TEST=golden-api-spec make test`) is the regeneration path. |

### Atomicity requirement

Remove the `@liquid-labs/liq-projects` entry and add the `@sdlcforge/dev-core` entry in the same commit — see [How an unsynchronized swap fails](#how-an-unsynchronized-swap-fails) for the general mechanism. For `liq-projects` specifically, loading both packages at once does **not** reach the route-registration stage at all — it crashes earlier, during plugin `setup`, because `liq-projects`'s `setup` and `dev-core`'s composite `setup` (which runs the absorbed `projects` submodule's identical setup logic first, per its ordering) both call `registerPathVar('newProjectName', …)` before either registers `'projectName'` or any route. Loading order runs `explicitPlugins` sequentially, and `@sdlcforge/dev-core` sorts after `@liquid-labs/liq-projects` in that array (per the edit above), so `liq-projects` registers first and `dev-core`'s setup collides on the second pass:

```text
Path variable 'newProjectName' is already registered.
```

thrown from `plugable-express/src/lib/path-var-registry.mjs:28-34`. Had that not fired, the next error would have been the same route-level failure the [Overview](#overview) describes generally — a duplicated array-style command path, e.g.:

```text
Non-unique command path: projects/:projectName/detail
```

(or whichever `/projects` path registers first), thrown from `plugable-express/src/lib/register-handlers.js:129-131`. Both strings are named here verbatim so the failure is recognizable — and greppable — on sight. This is a **loud** failure, not a silent one; it happens at server startup, before the server ever accepts a request.

The credential side of the atomicity requirement runs the opposite direction — it is not about loading both packages at once, but about loading **neither**. `liq-projects`'s `setup` (`src/setup.mjs`) calls `setupCredentials({ credentialsDB : app.ext.credentialsDB })` from `@liquid-labs/credentials-db-plugin-github`, which registers the `GITHUB_API` credential type that `liq-integrations-issues-github` later fetches via `credentialsDB.getToken('GITHUB_API')` (`src/create-or-update-pull-request.mjs:32`) — an undeclared, load-order-dependent contract. `dev-core`'s composite `setup` performs the identical registration (the `projects` submodule runs first in its ordering), so the contract survives the swap **only if** the provider is never absent: a step that removes `@liquid-labs/liq-projects` from `explicitPlugins` without adding `@sdlcforge/dev-core` in the same change breaks GitHub-issue integration at runtime — silently, until a token is next requested, since `registerCredentialType` itself does not fail on a missing registration; the failure surfaces only downstream, the next time `getToken('GITHUB_API')` is called and finds no registered credential type at all.

### Provenance change

Every `/projects` endpoint's recorded `npmName` becomes `@sdlcforge/dev-core` instead of `@liquid-labs/liq-projects`. `@liquid-labs/plugable-express` takes plugin identity from the package manifest (`package.json`'s `name`/`description`), never from the loaded module's own `name`/`summary` exports, so `liq-projects`'s inert module-level `name = 'core-projects'` export was never visible to the server to begin with. The change is harmless at runtime but **visible** in the server's generated API spec and in `help` output, so `core-server`'s golden-API-spec snapshot must be re-verified after the swap rather than assumed unchanged (see the edit table above).

Plugin count is a one-for-one swap at this point, not a reduction: as of this writing, `dev-core` has absorbed all four donors (`liq-projects`, `liq-work`, `liq-orgs`, and `plugable-projects-audit`), but each donor's own `core-server` swap is a separate, per-consumer step this handoff document only specifies — it does not perform any of them. Swapping this one donor's entry for `@sdlcforge/dev-core` leaves the total explicit-plugin count unchanged; the plugin list only shrinks from four entries to one once all four swaps have actually been performed against a given `core-server` instance, per the [Overview](#overview). The one plugin entry's summary comes from `dev-core`'s `package.json` `description`, already authored as: "Plugable-express plugin for core-server consolidating the liq project lifecycle, work orchestration, org settings, and project audit capabilities into a single package."

No route, method, parameter, or response shape changes for any of the 19 `/projects` endpoints.

### What does not change

`app.ext._liqProjects` keeps its exact name — and so do the other three donors' equivalent keys: `app.ext._liqOrgs`, `app.ext.constants.WORK_DB_PATH`, and `app.ext.setupMethods`. No participant in the absorption renames any of these keys.

Verified readers of `app.ext._liqProjects` that need no change:

- `liq-integrations-issues-github` — `src/create-or-update-pull-request.mjs:26`, reading `app.ext._liqProjects.playgroundMonitor.getProjectData(projectFQN)`.
- `liq-controls` — `src/lib/integrations/get-question-controls.mjs:7`, reading the identical `app.ext._liqProjects.playgroundMonitor.getProjectData(projectName)` call.

`liq-plugins-lib`'s use of the string `@liquid-labs/liq-projects` (`src/lib/test/select-matching-plugins.test.js`, lines 17 and 20) is sample test data for a plugin-matching function, not a dependency — that file also uses a nonexistent `@liquid-labs/liq-projects2` package name in the same fixture, confirming the values are arbitrary test data rather than a real reference.

### Corrections and disclosures

#### Correction: `liq-controls`'s `load-controls.mjs` and its test fixture do not read `app.ext._liqProjects`

An earlier survey of this migration named `liq-controls`'s `src/lib/resources/load-controls.mjs`, plus an unspecified test fixture, alongside `get-question-controls.mjs` as readers needing no change for this swap. Re-verified directly against `liq-controls`'s source: `load-controls.mjs` reads `app.ext._liqOrgs.orgs` (line 6), not `app.ext._liqProjects` — it is a reader of the `liq-orgs` contract, relevant to that donor's own future handoff section, not to this one. No test fixture in `liq-controls` references `app.ext._liqProjects`, `playgroundMonitor`, or `getProjectData` anywhere in the repository; `get-question-controls.mjs` is the only file in `liq-controls` that reads the `_liqProjects` contract this swap touches.

### Verification checklist

A consumer's own task can confirm the swap landed cleanly with:

1. The server starts with no error — in particular, no `Path variable '...' is already registered.` or `Non-unique command path: ...` error, confirming the old and new entries were never loaded together (see [Atomicity requirement](#atomicity-requirement)).
2. `/projects/detail` (or another cheap `/projects` route) responds normally, with its response shape unchanged from before the swap.
3. The plugin list (the server's generated API spec, or `GET /server/plugins/list`) reports `@sdlcforge/dev-core` for the `/projects` routes, not `@liquid-labs/liq-projects`.
4. The `GITHUB_API` credential resolves — `credentialsDB.getToken('GITHUB_API')` succeeds, confirming `dev-core`'s composite `setup` registered the credential type in `liq-projects`'s place.
5. `core-server`'s three test tiers pass: the unit suite (`make test` / `npm test`, which also exercises the golden-API-spec snapshot), the local integration smoke test (`npm run test:local`, `scripts/test.sh`), and the Docker-based multi-Node-version integration suite (`npm run test:integration`, `test/run-integration-tests.sh`).

## liq-orgs

`liq-orgs` (the `orgs` submodule) has already landed in `dev-core` as of this writing — the second of the four absorptions to land, after `liq-projects`. That makes this the second swap `core-server`'s own plan-group can actually execute today: `core-server`'s own `package.json` and `explicitPlugins` array still carry `@liquid-labs/liq-orgs`, `@liquid-labs/liq-projects`, and `@liquid-labs/liq-work` unswapped as of this writing (re-verified below), so neither this swap nor `liq-projects`'s has landed in `core-server` yet. Whichever of the two executes first performs the one-time `@sdlcforge/dev-core` addition the [Overview](#overview) describes; whichever executes second only removes its own donor entry, exactly as the [liq-projects](#liq-projects) section states for its own case.

### Edits required in core-server

Re-verified directly against `core-server`'s `main` (commit `54b06d0`, 2026-08-17) while writing this section; every line below matched exactly, with no drift from the original plan reading.

| File | Line | Current | Required edit |
|---|---|---|---|
| `package.json` | 46 | `"@liquid-labs/liq-orgs": "^1.0.0-alpha.6",` | **Remove.** This is a registry version range, not a `file:.yalc/…` link — unlike `@liquid-labs/liq-projects`, nothing needs `yalc` unlinking; the entry is simply deleted. Add `"@sdlcforge/dev-core": "file:.yalc/@sdlcforge/dev-core"` once, shared with whichever other donor's swap lands in the same commit — do not add it a second time if it is already present. The [liq-projects](#edits-required-in-core-server-1) section's own table has the full `yalc publish`/`yalc add`/`provision-local-deps.sh` walkthrough for this shared addition; it is not repeated here. |
| `src/lib/app-init.mjs` | 37 | `'@liquid-labs/liq-orgs',` inside the `explicitPlugins` array (lines 33–44) | **Remove.** Add `'@sdlcforge/dev-core'` once, shared with the other donors' entries — do not add it a second time if it is already present. |
| `docs/architecture.md` | 51 | Prose naming `liq-orgs` among the explicit-tier package examples: `` e.g. `liq-controls`, `liq-credentials`, `liq-integrations`, `liq-integrations-issues-github`, `liq-orgs`, `liq-projects`, `liq-work`, plus several `sdlc-projects-*` workflow and `plugable-*` packages `` | **Update** — drop `liq-orgs` from the example list. |
| `docs/architecture/plugin-loading-tiers.md` | 56 | Row 4 of the explicit-plugin table: `\| 4 \| @liquid-labs/liq-orgs \| Organization management — creating and managing the organization entities the rest of the SDLC tooling operates within. \|` | **Update** — remove the row. Do not add a parallel `dev-core` row per donor; once all four donors have swapped, the table needs a single `dev-core` row replacing all four, a decision for whichever swap lands last (per the [liq-work](#edits-required-in-core-server) section's identical note). |
| `test/README.md` | 108 | `- \`@liquid-labs/liq-orgs\`` in the expected-plugin list | **Update** — remove the line. |

**No `core-server` test fixture names `liq-orgs`.** A search of `core-server`'s `test/` tree for `liq-orgs` returns only the `test/README.md` line above; `test/test-basic.js` and `test/test-integration-quick.js` list only `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-projects` — the same three-fixture set the `liq-projects` section already documents, unchanged by this swap.

Also note, without prescribing action: `explicitPlugins` currently holds **11** entries and does **not** include `@liquid-labs/liq-integrations` (which `plugable-express` lists in its `supersededPlugins` set and skips — `load-plugins.js:10-13`). Some project documentation still describes a 13-entry list including it; the source above is authoritative.

### Atomicity requirement

Remove the `@liquid-labs/liq-orgs` entry and add the `@sdlcforge/dev-core` entry in the same commit — see [How an unsynchronized swap fails](#how-an-unsynchronized-swap-fails) for why no intermediate state is viable in general. For `liq-orgs` specifically, loading both packages at once produces, first and loudest:

```text
Path variable 'newOrgKey' is already registered.
```

thrown from `plugable-express/src/lib/path-var-registry.mjs:28-34`. It fires before any handler-level error, because plugin `setup` runs eagerly (`load-plugins.js:29`) while handler registration is deferred into `app.ext.pendingHandlers` (see [How an unsynchronized swap fails](#how-an-unsynchronized-swap-fails)). `orgs`' submodule `setup` (`src/orgs/setup.mjs`) registers `newOrgKey` and `orgKey` synchronously, before returning — separately from the three `app.ext.setupMethods` entries it also queues (`prepare org dependencies` / `load orgs` / `process org setup`, which run later and do not register path vars). `orgKey` would produce the same error if `newOrgKey` were somehow skipped. Had it not fired, the next error would have been:

```text
Non-unique command path: orgs/create/:newOrgKey
```

(or one of the other four `/orgs` paths — `orgs/list`, `orgs/:orgKey/parameters/list`, `orgs/:orgKey/parameters/:parameterKey/detail`, `orgs/:orgKey/parameters/:parameterKey/set`), thrown from `plugable-express/src/lib/register-handlers.js:129-131`'s `processCommandPath`.

Both strings are named here verbatim so the failure is recognizable — and greppable — on sight. This is a **loud** failure, not a silent one; it happens at server startup, before the server ever accepts a request.

### Provenance change

Every `/orgs` endpoint's recorded `npmName` becomes `@sdlcforge/dev-core` instead of `@liquid-labs/liq-orgs`. Harmless at runtime, but **visible** in the server's generated API spec (`<serverConfigRoot>/core-api.json`) and in `help` output. `core-server`'s golden characterization snapshots — `test/__snapshots__/golden-api-spec.json` and `golden-plugins-list.json` — should be re-verified after the swap rather than assumed unchanged, though both are currently degenerate (`golden-plugins-list.json` is literally `[]`, and `golden-api-spec.json` carries no `/orgs` entries), so the swap is unlikely to actually move them.

### What does not change

- `app.ext._liqOrgs` keeps its exact name and both of its keys. `orgs` (a key→`Organization` map) is **read** by `liq-controls` at `src/lib/resources/load-controls.mjs:6`, `src/lib/integrations/get-question-controls.mjs:38`, and `src/lib/handlers/orgs/controls/_lib/list-lib.mjs:43` (plus its test fixture, `src/lib/handlers/orgs/controls/_lib/test/list-lib.test.mjs:18`). `orgSetupMethods` is **written** by `liq-policy` at `src/liq-policy/setup.mjs:30,38`. **Neither consumer needs any change.**
- The three `app.ext.setupMethods` entries `liq-orgs`' submodule registers keep their names, order, and `deps` markers — `['!']` on `prepare org dependencies`, none on `load orgs`, `['*']` on `process org setup` — so server startup ordering is unchanged.
- The path vars `orgKey`, `newOrgKey`, and `parameterKey` keep their names and validation regexes. `:orgKey` appears in handler paths owned by `liq-controls` (`src/lib/handlers/orgs/controls/list.mjs`) and `plugable-express` itself (`src/handlers/server/next-commands.mjs`), both live, and by the dormant `liq-policy` (e.g. `src/liq-policy/setup.mjs`, `src/liq-policy/handlers/orgs/policies/*`) and `liq-roles` (e.g. `src/setup.mjs`, `src/handlers/orgs/roles/*`). All keep working.
- All 5 `/orgs` routes keep their exact paths and methods: `orgs/list?`, `orgs/create/:newOrgKey`, `orgs/:orgKey/parameters/list?`, `orgs/:orgKey/parameters/:parameterKey/detail`, and `orgs/:orgKey/parameters/:parameterKey/set`.

### Corrections and disclosures

#### Disclosure: the migrated `/orgs` endpoints do not work

A reasonable post-swap smoke test is `GET /orgs/list`. It will fail, and it failed identically before the swap — this is a pre-existing defect, not something the swap introduces or should be blamed for:

- `list`, `parameters-detail`, `parameters-list`, and `parameters-set` throw `TypeError: Cannot read properties of undefined (reading 'orgs')` on first request, because they read a `model` argument `plugable-express` no longer passes to plugin handlers (`load-plugins.js:36` omits it from the `registerHandlers` call) — the data these handlers actually need lives at `app.ext._liqOrgs.orgs`, not `model.orgs`. `dev-core`'s own `src/orgs/handlers/list.mjs` carries an inline `KNOWN BROKEN` comment documenting exactly this, migrated as-is from the retired `liq-orgs` package.
- `POST /orgs/create/:newOrgKey` never sends a response and hangs — it creates the local directory (`fs.mkdir`) and then falls through with no `res` call, also carried over as-is and marked `KNOWN BROKEN` in `dev-core`'s `src/orgs/handlers/create.mjs`.

Use this positive check instead: the plugin loads without error, all 5 `/orgs` routes appear in the generated API spec under `@sdlcforge/dev-core`, and `app.ext._liqOrgs.orgs` is populated — observable indirectly through `liq-controls` continuing to work, since `load-controls.mjs` reads that same map on every request.

#### Correction: the consumer inventory beyond core-server is real for `liq-orgs` (C2)

The [Dev-Core Consolidation Contract](./dev-core-consolidation-contract.md#source-package-retirement-policy) states that "the only npm dependent of any source package is `@sdlcforge/core-server`." That is true for `liq-projects` and **false for `liq-orgs`.** Beyond `core-server`, `@liquid-labs/liq-orgs` is declared in `package.json` by:

- `@liquid-labs/liq-roles` (`^1.0.0-alpha.1`) — dormant, last commit 2023-11-26; also shells out to `npm explore @liquid-labs/liq-orgs -- pwd` in two test files, `src/handlers/orgs/jobs/test/list.test.js:12` and `src/handlers/orgs/jobs/test/detail.test.js:12`.
- `@liquid-labs/liq-test-lib` (`^1.0.0-alpha.2`) — **already broken independently of this plan:** `src/org-setup.mjs` imports `appInit`/`initModel`/`Reporter` from the retired `@liquid-labs/liq-core` and loads the likewise-retired `@liquid-labs/liq-playground` and `@liquid-labs/liq-staff`.

Neither is loaded by the running server, neither is a wave participant, and **neither is this plan-group's to fix** — but both would break on an `npm deprecate`/unpublish of `@liquid-labs/liq-orgs`, so this is recorded here rather than left for a later reader to trust the inherited "only core-server" claim.

Also recorded, as dead metadata needing no action: `liq-controls/plugable-express.yaml` declares `dependencies: ['@liquid-labs/liq-projects', '@liquid-labs/liq-orgs']`, but **no code anywhere reads that file** (verified by grep across all `.js`/`.mjs` outside `node_modules` in the `liquid-labs` checkouts). And `plugable-registry/registry.yaml` catalogs `@liquid-labs/liq-orgs` (lines 18, 40, and 50); updating a registry catalog is outside this plan-group.

## projects-audit

`plugable-projects-audit` (the `projects-audit` submodule — the short name drops the `plugable-` framework prefix, the same way `liq-projects`, `liq-orgs`, and `liq-work` drop their own `liq-` prefix) has now landed in `dev-core` as of this writing — the fourth and last of the four absorptions to land, after `liq-projects`, `liq-orgs`, and `liq-work`. That completes the set: every donor this document covers has landed, so consumer migration is now fully actionable for all four, not just three of them. `core-server`'s own `package.json` and `explicitPlugins` array still carry all four donor entries unswapped as of this writing (re-verified below), so none of the four swaps has landed in `core-server` yet. Whichever swap executes first performs the one-time `@sdlcforge/dev-core` addition the [Overview](#overview) describes; whichever of the remaining three — including this one — executes later only removes its own donor entry, exactly as the [liq-projects](#liq-projects) section states for its own case.

### Edits required in core-server

Re-verified directly against `core-server`'s `main` (commit `54b06d0`, 2026-08-17) while writing this section; every line below matched exactly.

| File | Line | Current | Required edit |
|---|---|---|---|
| `package.json` | 50 | `"@liquid-labs/plugable-projects-audit": "^1.0.0-alpha.2",` | **Remove.** A registry version range, not a `file:.yalc/…` link — unlike `liq-projects`, nothing needs `yalc` unlinking on removal. Add `"@sdlcforge/dev-core": "file:.yalc/@sdlcforge/dev-core"` once, shared with whichever other donor's swap lands in the same commit — do not add it a second time if it is already present. |
| `src/lib/app-init.mjs` | 40 | `'@liquid-labs/plugable-projects-audit',` inside the `explicitPlugins` array | **Remove.** Add `'@sdlcforge/dev-core'` once, shared with the other donors' entries — do not add it a second time if it is already present. |
| `docs/architecture/plugin-loading-tiers.md` | 59 | Row 7 of the explicit-plugin table: `\| 7 \| @liquid-labs/plugable-projects-audit \| Project auditing — auditing a project and applying fixes for audit issues found. \|` | **Update** — remove the row; the rows after it renumber. Do not add a parallel `dev-core` row per donor; once all four donors have swapped, the table needs a single `dev-core` row replacing all four (per the [liq-work](#edits-required-in-core-server) section's identical note). |
| `test/README.md` | 111 | `- \`@liquid-labs/plugable-projects-audit\`` in the expected-plugin list | **Update** — remove the line. |
| `AGENTS.md` | 60 | the yalc-snapshot paragraph, which names this package as the source of the transitive `http-smart-response` `file:.yalc/…` resolution | **Update** — see [The `http-smart-response` simplification](#the-http-smart-response-simplification) below. |
| `scripts/provision-local-deps.sh` | 8, 31–35, 79 | the header comment, the `REQUIRED_YALC_PACKAGES` array, and the missing-package error text | **Update** — see [The `http-smart-response` simplification](#the-http-smart-response-simplification) below. |
| `bun.lock` | 374, 1776 | — | **Regenerated, never hand-edited.** Per `core-server`'s own `AGENTS.md`, a `file:` resolution change requires `rm -f bun.lock && bun install` (or `./scripts/provision-local-deps.sh --refresh-lock`); a bare `bun install` will not re-resolve it. |

**No `core-server` test fixture needs changing.** `test/test-basic.js:54` and `test/test-integration-quick.js:61` (and its second, fallback-path occurrence at line 87) assert only `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-projects` — this donor was never in that list. `test/README.md:111`, updated above, is prose naming the expected-plugin list, not a test assertion; it is a real touch-point but not a fixture. A reader who has just done the [liq-projects](#liq-projects) section (three fixtures) will expect symmetry here that doesn't exist — this donor needs none, the same as [liq-orgs](#liq-orgs).

### The `http-smart-response` simplification

This is the part unique to this slice: removing `plugable-projects-audit` doesn't just delete a dependency line, it removes a `file:.yalc/…` resolution that has no other reason to exist in `core-server`'s lock. `bun.lock:1776` records `@liquid-labs/plugable-projects-audit/@liquid-labs/http-smart-response` resolving to `@liquid-labs/http-smart-response@file:.yalc/@liquid-labs/http-smart-response`. That entry exists **only** because this donor's published `1.0.0-alpha.2` declares the dependency as a `file:.yalc/…` spec — this plan's phase 11 fixes the donor itself, but `core-server`'s lock still carries the old resolution until this swap lands. `@liquid-labs/plugable-express` declares the same package at the registry range `^1.0.0-alpha.6`, and `@sdlcforge/dev-core` will too.

So, once this donor is removed:

- `scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` array (lines 31–35) drops `"@liquid-labs/http-smart-response"`, going from three entries to two (`@liquid-labs/plugable-express` and, until `liq-projects` is also swapped, `@liquid-labs/liq-projects`). Its header comment (line 8) and its missing-package error text (line 79) — both of which name this package explicitly as the source of the transitive resolution — lose that clause.
- `AGENTS.md:60`'s statement that `bun.lock` "currently resolves three packages via `file:.yalc/…`: two direct … plus one transitive … pulled in by `@liquid-labs/plugable-projects-audit`'s own pinned dependency" becomes false and must be updated to two. That paragraph already asks the reader to re-derive it with `grep -n 'file:\.yalc' bun.lock` when in doubt, and to keep `scripts/provision-local-deps.sh`'s own `REQUIRED_YALC_PACKAGES` list in sync — do exactly that as part of this edit.

This is a **simplification**, not a regression: the yalc-linked package count in `core-server` drops from three to two because a spurious transitive `file:` link disappears along with the donor that caused it, not because anything broke.

### Atomicity requirement

Remove the `@liquid-labs/plugable-projects-audit` entry and add the `@sdlcforge/dev-core` entry in the same commit — see [How an unsynchronized swap fails](#how-an-unsynchronized-swap-fails) for why no intermediate state is viable in general. For `plugable-projects-audit` specifically there are **two distinct** failure modes, and the handoff names both because they look nothing alike.

**Both loaded at once** → duplicate registration. Plugin `setup` runs eagerly while handler registration is deferred (see the [Overview](#overview)), so the first collision fires during `setup`:

```text
Path variable '<name>' is already registered.
```

thrown from `plugable-express/src/lib/path-var-registry.mjs:28-34` — it throws, it does not silently shadow (correction **C1**). Had that not fired, the next error would have been a duplicated command path:

```text
Non-unique command path: projects/audit
```

(or whichever of this donor's `/projects/audit*` paths registers first), thrown from `plugable-express/src/lib/register-handlers.js:130-132`.

**This donor left in `explicitPlugins` while `liq-projects` is removed** → a different failure, unique to this donor among the four (correction **C14**):

```text
Unknown variable path element type 'projectName' while processing path projects/:projectName/audit.
```

thrown from `plugable-express/src/lib/path-to-re.mjs:14-19`. Two of this donor's four paths — `projects/:projectName/audit` and `projects/:projectName/audit-fix` — use the `projectName` path variable, and **only** the `projects` submodule's `setup` registers it; if `liq-projects` is gone from `explicitPlugins` while this donor is still present, that registration never happens and `pathToRe` throws it during handler registration instead of during `setup`. This failure mode exists in no sibling handoff section — none of the other three donors shares a path variable with `liq-projects`.

All three strings are named here verbatim so each failure is recognizable — and greppable — on sight. Both are **loud** failures, not silent ones.

### Provenance change

Every one of this donor's four endpoints' recorded `npmName` becomes `@sdlcforge/dev-core` instead of `@liquid-labs/plugable-projects-audit`. Harmless at runtime, but **visible** in `/server/plugins/list`, in the generated API spec, and in `help` output — so any golden snapshot capturing these fields must be re-verified after the swap rather than assumed unchanged.

### What does not change

- `app.ext._liqProjects` is preserved verbatim (D7). Both of this donor's library functions — `doAudit` and `doAuditFix` — call `app.ext._liqProjects.playgroundMonitor.getProjectData(projectName)`; the key, the object, and the method are unchanged by the consolidation.
- `sdlcforge/core-cli/docs/projects.md` needs no edit. It is generated CLI reference documentation that already interleaves all four audit endpoints with `liq-projects`'s under one `/projects` page and carries no package provenance. Because every `path` and every `help` string is preserved byte-identically, it regenerates identically — mentioned here only so its appearance in a `grep` doesn't look like a missed touch-point.
- No `app.ext` key, route, method, parameter, or help string changes.

### Corrections and disclosures

#### Confirmation: the single-consumer claim holds for `plugable-projects-audit`

The [Dev-Core Consolidation Contract](./dev-core-consolidation-contract.md#source-package-retirement-policy) states that "the only npm dependent of any source package is `@sdlcforge/core-server`." That holds here — verified by a playground-wide grep for `plugable-projects-audit` across every `package.json`, `*.mjs`, `*.js`, `*.md`, `*.yaml`, and `*.sh` outside `node_modules/`, `dist/`, `test-staging/`, and lockfiles. Unlike `liq-orgs` (correction **C2**), there is no second dependent to disclose: `core-server` is the only consumer anywhere in the playground.

#### Disclosure: the inherited defects migrate unchanged

Four defects travel with this donor into `dev-core`, none introduced by the consolidation and none fixed by it — worth knowing before attributing a post-swap bug report to the swap itself:

- The two *implied* endpoints (`projects/audit`, `projects/audit-fix`) advertise a `projectName` parameter in their generated API spec and `help` output that they cannot actually use — the value comes from the `X-CWD` request header, not the path.
- `audit-fix-lib.mjs`'s `removePackages` parameter object uses the key `dascription` instead of `description`, so its explanation is silently dropped from the API spec.
- An unknown project name produces a `500`, not a `404`: `getProjectData` returns `undefined` for a name it doesn't recognize, and both library functions destructure that result immediately.

`dev-core`'s own [README](./README.md#projects-audit-submodule) — the `projects-audit submodule` section, following the pattern of its existing `projects submodule`, `work submodule`, and `orgs submodule` sections — has the fuller account, including exact source locations. This handoff states them briefly so a consumer swapping packages isn't the last to know.
