# Consumer Migration Handoff

## Purpose and scope

This document specifies, for each of the four `@liquid-labs/plugable-express` plugin packages `@sdlcforge/dev-core` supersedes, the exact edits `@sdlcforge/core-server` — the one npm consumer of each — must make to stop loading the standalone package and start getting the same routes and runtime contracts from `@sdlcforge/dev-core` instead. It is a specification, not an execution log: writing an edit down here does not perform it. Executing these edits belongs to `core-server`'s own plan-group; this document exists so that plan-group never has to re-derive facts that are only knowable from `dev-core`'s own source and history.

The [Dev-Core Consolidation Contract](./dev-core-consolidation-contract.md) governs the separate, earlier step of absorbing a package's source into `dev-core`. This document governs the later, independent step of repointing the consumer once an absorption has landed — the two are not the same operation and do not share a timeline.

One section per absorbed package, keyed by submodule short name (`liq-projects`, `liq-orgs`, `liq-work`, `projects-audit`), each added independently as its own handoff is authored. Only the `liq-work` section exists as of this writing.

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

## Overview

Every one of the four packages this document covers is removed from `core-server`'s `explicitPlugins` array and its `package.json` `dependencies` in the same change that adds `@sdlcforge/dev-core` — added once, shared across whichever donor's swap happens to land first, never re-added for the donors that follow. There is no viable intermediate state where a donor package and `@sdlcforge/dev-core` are both loaded at once, and none where neither is loaded: the first strands whichever routes and `app.ext` contract that donor owns, the second crashes the server (see below).

### How an unsynchronized swap fails

Loading a donor package and `@sdlcforge/dev-core` together does not silently shadow routes — it crashes the server at startup. `@liquid-labs/plugable-express`'s plugin loader (`load-plugins.js:29`) invokes each plugin's `setup` eagerly, before any handler registration happens (handler registration is deferred into `app.ext.pendingHandlers` and runs only after every plugin's `setup` has completed). Any path variable a donor registers during `setup` that `@sdlcforge/dev-core` also registers therefore collides, and `registerPathVar` (`plugable-express/src/lib/path-var-registry.mjs:28-34`) throws immediately — before handler registration is even attempted. Had that not fired, the next collision would be a duplicated array-style command path, thrown by `processCommandPath` (`plugable-express/src/lib/register-handlers.js:129-131`) once handler registration does run.

This corrects `dev-core-target-shape.md`'s original wording (decision D10), which assumed a non-atomic swap would silently shadow routes — it does not. The failure is loud and unmissable, which is the practical reason the swap is safe to attempt at all: an operator cannot get it half-right without the server refusing to start. Each donor's own section below names the exact strings its swap produces.

## liq-work

`liq-work` (the `work` submodule) has not yet landed in `dev-core` as of this writing. This section documents the `core-server` edits its swap requires so that `core-server`'s own plan-group can execute them the moment the submodule lands, without waiting on or re-deriving anything from this plan.

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
