# WIP Branch Triage

## Purpose and scope

Verification of the local WIP branch `work-sdlcforge/core-server/64` as a candidate source of work for the Bun conversion. Records what the branch actually changes, what is safe to carry forward, and what must not be. This note corrects several conclusions drawn from a `git diff main work-sdlcforge/core-server/64` read, which is misleading for this branch.

## The branch is stale, not contaminated

The single most important fact: the branch's merge-base with `main` is `dd775e0` ("Merge branch 'task/doc-author-core-server'"). `main` has advanced **45 commits** past that point, including the entire completed `modernization-foundation` plan.

```
dd775e0  <- merge-base
   |\
   | \--- 84f1a87  work-sdlcforge/core-server/64  (3 commits, 2026-08-08)
   |
   \----- f62b9fd  main  (45 commits, incl. all of modernization-foundation)
```

Because of this, `git diff main work-sdlcforge/core-server/64` renders **main's newer work as deletions on the branch side**. Most of what looks like "the branch removed X" is really "the branch never had X, because X landed on main afterwards." The only diff that describes what the branch actually did is against its merge-base:

```bash
git diff dd775e0 work-sdlcforge/core-server/64
```

That diff touches 11 files, not 18.

## Corrections to the initial read

Three items flagged as branch-introduced problems are not branch changes at all.

### `src/lib/index.js` name/summary — already fixed on main

The branch **does not touch `src/lib/index.js`**. The file is absent from `git diff dd775e0 work-sdlcforge/core-server/64` entirely.

`const name = 'snippets'` / `const summary = 'Snippet handling.'` was pre-existing contamination sitting on the merge-base, and it was **already fixed on `main`** by commit `1da55f6` ("implement phase-01 task 003: update stale exports and fix version-pin typo"), which set the values to `'@sdlcforge/core-server'` and the correct summary. `main` is already correct. There is nothing to drop and no action required.

### Golden-api-spec removal — nothing was removed

`src/lib/test/golden-api-spec.test.js`, `test/__snapshots__/golden-api-spec.json`, `test/__snapshots__/golden-plugins-list.json`, `plan/resources/golden-api-spec-baseline.md`, and the `test:update-golden-api-spec` npm script were all **added to `main` by commit `f31deb9`** (modernization-foundation phase-01 task-001), which is *after* the branch point. The branch simply never had them.

There is no deliberate deletion to evaluate and no ambiguity to resolve. These artifacts stay on `main` untouched. The characterization test is in fact *useful* to this plan: it is the regression harness that proves the Bun conversion did not change the server's API surface.

### `test/` diffs — stale reformatting that would revert a real fix

The four changed `test/*.js` files (`test-server.js`, `test-integration-quick.js`, `test-basic.js`, `get-node-versions.js`) contain **no Bun-related content**. They are pure ESLint/Catalyst-style reformatting: object-key alignment, `catch`/`else` moved to their own lines, arrow-body braces, unused-variable removal, trailing newlines. Regenerable at any time with `make lint-fix`.

Carrying them over would actively cause harm: the branch's `test/test-server.js` predates `main`'s commit `e1fad37` ("fix: add host-relative fallback for test:local integration-results path") and would **revert it**, restoring the hardcoded `/project/test-staging/integration-results` container path and re-breaking `npm run test:local` on a bare host checkout. The branch version also introduces a commented-out dead `serverOutput` block.

**Take nothing from `test/`.**

## What the branch actually changed

| Change | Verdict |
|---|---|
| Pin 11 `*` dependency specifiers to `^1.0.0-alpha.N` | **Take** — a hard prerequisite for Bun (see below) |
| Add `bun.lock`, delete `package-lock.json` | **Regenerate**, do not cherry-pick — the lockfile is stale, built against the merge-base's dependency set and before `main` moved to `plugable-express@1.0.0-alpha.57` |
| `serverConfigRoot` → `fsPath.join(process.env.HOME, '.config', 'comply-server')` | **Open question** — deliberate, not contamination (see below) |
| Add 5 new dependencies | **Open question** — none is referenced by any source file |
| Switch 4 more deps to `file:.yalc/…` | **Do not take** — see the gitignore hazard below |
| `.gitignore` `+/status.md` | Harmless; a stray agent scratch-file entry. Optional. |
| `src/lib/test/app-init.test.js` `serverHome` → `serverConfigRoot` rename | **Already on main** via `24630c7`; branch version is equivalent. No action. |
| `test/*.js` lint reformatting | **Do not take** — reverts `e1fad37` |
| `plan/manifest.yaml`, plan bookkeeping | **Do not take** — stale `modernization-foundation` artifacts |

### The dependency pins are essential, not cosmetic

The pins are the branch's single genuinely valuable contribution, and the reason is stronger than tidiness. Running `bun install` against `main`'s current `package.json` **fails outright**:

```
error: No version matching "*" found for specifier "@liquid-labs/liq-controls" (but package exists)
error: @liquid-labs/liq-controls@* failed to resolve
```

…repeated for all 11 wildcard dependencies. Every one of these packages publishes **only prerelease versions** (`1.0.0-alpha.N`), and under strict semver a bare `*` range does not match a prerelease. npm is lenient about this; Bun is not.

Verified published state:

| Package | Latest published |
|---|---|
| `@liquid-labs/liq-controls` | `1.0.0-alpha.9` |
| `@liquid-labs/liq-orgs` | `1.0.0-alpha.6` |
| `@liquid-labs/liq-work` | `1.0.0-alpha.9` |
| `@liquid-labs/plugable-server-documentation` | `1.0.0-alpha.0` |
| `@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd` | `1.0.0-alpha.2` |
| `@liquid-labs/sdlc-projects-workflow-local-node-build` | `1.0.0-alpha.7` |

A `^1.0.0-alpha.N` range does match later prereleases of the same `1.0.0` tuple, so the branch's approach is correct in kind.

**The branch's pin list must not be copied verbatim.** It contains a typo that would break resolution:

```json
"@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd": "^1.0.0-alpah.2"
```

`alpah` should be `alpha`. Pins must be re-derived against currently-published versions rather than transcribed.

### The `file:.yalc/…` dependencies are a portability hazard

`.yalc/` and `yalc.lock` are both **gitignored**. Any `file:.yalc/…` entry in `package.json` therefore points at content that does not exist in a fresh clone, a task worktree, CI, or the Docker integration container — `bun install` fails there with `failed to resolve`, confirmed empirically.

`main` already carries this hazard for two packages (`plugable-express`, `liq-projects`); `test/setup-local-deps.sh` exists to work around it inside the Docker container by copying `file:` dependency trees from a mounted `deps/` directory. The WIP branch would **triple** the exposure by adding `git-toolkit`, `playground-monitor`, `liq-work`, and `sdlc-projects-workflow-local-node-build`.

Three of those four have published releases and do not need a yalc link at all. Prefer published `^1.0.0-alpha.N` pins and keep the yalc set as small as the local dev loop genuinely requires.

### `serverConfigRoot` is a deliberate change, not contamination

The branch changes the value passed to `plugable-express`:

```js
// main (from modernization-foundation, a deliberate pure rename preserving prior behavior)
serverConfigRoot : myPackagePath          // = dirname of the resolved package.json

// work-sdlcforge/core-server/64
serverConfigRoot : fsPath.join(process.env.HOME, '.config', 'comply-server')
```

Corroborating evidence that this was intentional: the working checkout's stale build output `dist/sdlcforge-server-exec.js` (built 2026-08-06, i.e. before the branch commit) **already contains the HOME-based value** *and* carries a `#!/usr/bin/env -S bun` shebang instead of the Makefile's `#!/usr/bin/env -S node --enable-source-maps`. The author was hand-running a Bun spike locally and chose this value deliberately.

Both sides have a case. `main`'s `myPackagePath` was chosen by a completed, reviewed plan whose task was explicitly a behavior-preserving rename. The HOME-based value is arguably more correct for a globally-installed or `bunx`-run package, where the package directory may be read-only or ephemeral.

This is a genuine runtime-behavior decision that cannot be inferred, so it is raised as a user question rather than silently dropped. Note that the branch's implementation has two defects independent of the choice itself: `process.env.HOME` is unguarded (undefined on Windows, yielding a `TypeError` from `fsPath.join`), and it bypasses `@liquid-labs/comply-defaults`, which `AGENTS.md` names as the project's centralized configuration mechanism. If the HOME-based root is adopted, it should be added as a `comply-defaults` accessor, not inlined.

### The five added dependencies are unexplained

The branch adds `@liquid-labs/git-toolkit`, `@liquid-labs/github-toolkit`, `@liquid-labs/npm-toolkit`, `@liquid-labs/playground-monitor`, and `@liquid-labs/sdlc-lib-build` to `dependencies`.

None of them is imported by any of core-server's three source files, and the `explicitPlugins` array in `src/lib/app-init.mjs` is **unchanged** by the branch — so none is registered as a plugin either. They may be intended as new explicit plugins, or as manual transitive-dependency backfill for the yalc links, or they may be contamination. Raised as a user question.

## Recommended handling

Treat `work-sdlcforge/core-server/64` as a **read-only reference**. Do not merge, rebase, or cherry-pick it.

Its durable value reduces to two things, both already extracted into this note:

1. The knowledge that wildcard dependency specifiers must be pinned for Bun to resolve them at all.
2. A list of which dependency versions the author was targeting — to be re-verified, not transcribed.

Everything else is either already on `main`, regenerable, stale, or an open question. The branch can be left in place as history; nothing in this plan depends on it.
