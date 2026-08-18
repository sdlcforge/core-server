# liq-work Source Inventory

## Purpose and scope

Ground truth for the `liq-work` slice of the federated `dev-core-consolidation` plan-group: package facts, the complete route surface, the exact `src/` path mapping into `@sdlcforge/dev-core`, the dependency union (the most entangled of the four donors), the **measured** validation baseline, the full consumer inventory, the `crossLinkDevProjects` absorption evidence, four surfaced pre-existing defects, and four corrections/extensions to the shared foundation.

Everything below was read from source or measured by running the toolchain on 2026-08-18 at `liq-work` `main` = `cc3e67f`. Where this note contradicts `dev-core-target-shape.md` or `liq-work`'s own `README.md`, this note is the later reading and the commands to re-verify are given inline.

## W0 — Package facts

| Field | Value |
|---|---|
| Name | `@liquid-labs/liq-work` |
| Version (local and npm `latest`) | `1.0.0-alpha.10` |
| `main` | `dist/liq-work.js` |
| `description` | Accurate and current — the "unit of work" paragraph the dispatch brief quotes |
| Module entry | `src/index.js` (exports `handlers`, `setup`, and inert `name`/`summary`) |
| Toolchain | `@liquid-labs/catalyst-scripts-node-project ^1.0.0-alpha.22` (**sole** devDependency) |
| Build | Rollup → `dist/liq-work.js` from `src/index.js` |
| Tracked files under `src/` | **69** |
| Handlers | **30** |
| Test suites | 2 |
| `README.md` | Present, detailed, and **accurate** (verified against source; see W7 for the one correction) |

`git ls-files | grep -v '^src/'` returns exactly: `.gitignore`, `Makefile`, `README.md`, `package-lock.json`, `package.json`, `plan/manifest.yaml`, `plan/plan-summary-modernization-foundation.md`, `plan/plan-summary-pluggable-defaults-rename.md`. Note what is **absent** relative to the other donors: **no `make/*.mk` directory**, **no `.sdlc-data.yaml`**, **no `.catalyst-data.yaml`**, **no `docs/`**. liq-work is on an older, monolithic-`Makefile` generation of the build tooling than either liq-projects (`sdlc-resource-*`, builder `1.0.0-alpha.5`) or liq-orgs (`catalyst-resource-*`, builder `1.0.0-alpha.0`). Per D3 and D8 this costs nothing — dev-core's root files win outright and liq-work contributes none — it simply means liq-work's absorb has a **smaller** conflict set than either sibling's.

Working tree is clean apart from untracked `.flow/`, `worktrees/`, `.yalc/`, `node_modules/`, build outputs, and one stray untracked `jsdoc-config.json~`. Unlike liq-orgs, **there is no dirty-working-tree decision to make before starting.**

## W1 — Route surface: 30 handlers

Measured, not read: built the bundle and enumerated `path`/`method` from the loaded module (see W5 for why this needed a shim).

| # | Method | `path` |
|---|---|---|
| 1 | PUT | `['work', ':workKey', 'build']` |
| 2 | PUT | `['work', 'build']` |
| 3 | PUT | `['work', ':workKey', 'clean']` |
| 4 | PUT | `['work', 'clean']` |
| 5 | PUT | `['work', ':workKey', 'close']` |
| 6 | PUT | `['work', 'close']` |
| 7 | PUT | `['work', ':workKey', 'pause']` |
| 8 | PUT | `['work', 'pause']` |
| 9 | PUT | `['work', ':workKey', 'qa']` |
| 10 | PUT | `['work', 'qa']` |
| 11 | PUT | `['work', ':workKey', 'resume']` |
| 12 | PUT | `['work', ':workKey', 'save']` |
| 13 | PUT | `['work', 'save']` |
| 14 | POST | `['work', 'start']` |
| 15 | PUT | `['work', ':workKey', 'status']` |
| 16 | PUT | `['work', 'status']` |
| 17 | POST | `['work', ':workKey', 'submit']` |
| 18 | POST | `['work', 'submit']` |
| 19 | PUT | `['work', ':workKey', 'issues', 'add']` |
| 20 | PUT | `['work', 'issues', 'add']` |
| 21 | GET | `['work', ':workKey', 'issues', 'list']` |
| 22 | GET | `['work', 'issues', 'list']` |
| 23 | DELETE | `['work', ':workKey', 'issues', 'remove']` |
| 24 | DELETE | `['work', 'issues', 'remove']` |
| 25 | PUT | `['work', ':workKey', 'projects', 'add']` |
| 26 | PUT | `['work', 'projects', 'add']` |
| 27 | GET | `['work', ':workKey', 'projects', 'list']` |
| 28 | GET | `['work', 'projects', 'list']` |
| 29 | DELETE | `['work', ':workKey', 'projects', 'remove']` |
| 30 | DELETE | `['work', 'projects', 'remove']` |

Every handler uses `path` (singular); **none uses `paths`**. Every route is rooted at `work`.

**No collisions with any other donor.** `/work` is a namespace no other participant touches (`liq-projects` and `plugable-projects-audit` are under `/projects`, `liq-orgs` under `/orgs`). Verified with `grep -rn "path = \['work'" liquid-labs sdlcforge` excluding `liq-work` — no matches.

**No path-var collision.** liq-work registers exactly one path var, `workKey`. A playground-wide `grep -rn "registerPathVar("` over every `src/` shows the complete registered set is `credential` (liq-credentials), `integrationPluginName` (plugable-express **and** liq-integrations), `newOrgKey`/`orgKey`/`parameterKey` (liq-orgs), `newProjectName`/`projectName` (liq-projects), `serverPluginName`/`errorKey` (plugable-express), `workKey` (liq-work). `workKey` is unique. (D6's merged set is therefore confirmed with C3's `parameterKey` addition.)

## W2 — Path mapping into dev-core

Per D2: one top-level `src/work/` directory; everything under the donor's `src/` moves beneath it; the now-redundant `handlers/work/` nesting flattens to `handlers/`.

| Rule | From | To | Count (today) |
|---|---|---|---|
| Flatten | `src/handlers/work/**` | `src/work/handlers/**` | **65** |
| Move | `src/setup.mjs` | `src/work/setup.mjs` | 1 |
| Move | `src/docs/Issues.md` | `src/work/docs/Issues.md` | 1 |
| Delete | `src/handlers/index.js` (one-line `export * from './work'` shim) | — | 1 |
| Reduce | `src/index.js` | thin re-export of `./work` (dropped at absorb time per D3) | 1 |
| Create | — | `src/work/index.mjs` (submodule surface: `handlers`, `setup`) | 1 |

Measured today: `git ls-files src` = **69** — 65 under `src/handlers/work/`, plus `src/handlers/index.js`, `src/docs/Issues.md`, `src/index.js`, `src/setup.mjs`.

**Census arithmetic through the plan.** Phase 7 changes the count before phase 8 ever runs, so no task should hard-code a number without deriving it:

| Point | `git ls-files src` | Why |
|---|---|---|
| Today (`cc3e67f`) | 69 | — |
| After phase 7 task 001 | 69 | gitlink entry removed (−1), `…/proj1/package.json` tracked (+1) |
| After phase 7 task 002 | 72 | +`_lib/cross-link-dev-projects.mjs`, +`_lib/test/cross-link-dev-projects.test.js`, +`_lib/test/data/cross-link/orgA/proj1/package.json` — all under `src/handlers/work/`, which becomes 68 |
| After phase 8 task 001 | 72 | 70 files relocated, `src/handlers/index.js` deleted (−1), `src/work/index.mjs` created (+1), `src/index.js` reduced in place |
| In dev-core after phase 8 task 002 | `src/work` = **71** | 72 minus the root `src/index.js`, which D3 drops at absorb time |

These are derivations, not measurements. **Each task records its own measured census**, and the next task compares against that recorded number rather than against this table.

### Import-rewrite analysis — exactly one rewrite needed

`grep -rn "from '\.\./\.\./" src/` returns 11 hits, all inside `src/handlers/work/{issues,projects}/_lib/` reaching `../../_lib/…` (i.e. `src/handlers/work/_lib/…`). After the flatten those become `src/work/handlers/{issues,projects}/_lib/` reaching `src/work/handlers/_lib/…` — **`../../_lib/…` still resolves**, because the whole subtree moves uniformly. No rewrite.

(Phase 7 task 002 adds a twelfth intra-`_lib` import when `work-db.mjs` starts importing `./cross-link-dev-projects`; it is a same-directory `./…` specifier and is equally unaffected by the move.)

Every other relative import is `./…` within one directory. The **one** import that must change:

- `src/setup.mjs` line 3: `import { WorkDB } from './handlers/work/_lib/work-db'` → `import { WorkDB } from './handlers/_lib/work-db'` (because `setup.mjs` moves to `src/work/setup.mjs` and the `work` nesting under `handlers/` is gone).

This is the single content edit in an otherwise pure `git mv`. `src/index.js` and `src/handlers/index.js` are rewritten/deleted outright and are not "moved files."

### `src/docs/Issues.md`

A four-line domain note on internal issue-ID format. D2 rule 2 ("everything the donor has under its own `src/` moves under that one directory") puts it at `src/work/docs/Issues.md`. That is *not* dev-core's root `docs/` (which D3 reserves for dev-core), so there is no ownership conflict and no build impact — the Make JS-source finder selects only `*.js`/`*.mjs`/`*.cjs`, and the data finder selects only `*/test/data*`. Folding it into dev-core's root `docs/` is a cosmetic follow-up, not consolidation work.

## W3 — Dependencies: the entangled union

liq-work declares **14** runtime dependencies. It is the only donor whose ranges materially interact with another donor's.

### Overlaps with donors already absorbed

| Package | liq-work | Other donor | Resolution |
|---|---|---|---|
| `@liquid-labs/github-toolkit` | **`^1.0.0-alpha.25`** | projects `^1.0.0-alpha.20` | **liq-work is higher — dev-core must move to `^1.0.0-alpha.25`** |
| `@liquid-labs/federated-json` | `^1.0.0-alpha.33` | projects `^1.0.0-alpha.34` | keep projects' |
| `@liquid-labs/git-toolkit` | `^1.0.0-alpha.14` | projects `^1.0.0-alpha.16` | keep projects' |
| `@liquid-labs/http-smart-response` | `^1.0.0-alpha.3` | projects `^1.0.0-alpha.6` | keep projects' |
| `@liquid-labs/liq-handlers-lib` | `^1.0.0-alpha.13` | orgs `^1.0.0-alpha.17` | keep orgs' |
| `@liquid-labs/shell-toolkit` | `^1.0.0-alpha.3` | projects `^1.0.0-alpha.10` | keep projects' |
| `@liquid-labs/liq-qa-lib` | `^1.0.0-alpha.9` | projects `^1.0.0-alpha.9` | identical |
| `@liquid-labs/npm-toolkit` | `^1.0.0-alpha.21` | projects `^1.0.0-alpha.21` | identical |
| `@liquid-labs/octocache` | `^1.0.0-alpha.4` | projects `^1.0.0-alpha.4` | identical |

**`github-toolkit` is the one case in the whole plan-group where D4's "take the higher range" rule actually fires**, and it fires in a direction that is an *effective upgrade for an already-absorbed submodule* (`src/projects/` moves from an `alpha.20`-satisfying resolution to `alpha.25`). Under a caret range on a `1.0.0-alpha.x` line npm treats each prerelease as its own step, so `^1.0.0-alpha.20` would already have resolved `alpha.25` in practice — the union is very likely a no-op at the lockfile level — but it must be *verified* at the lockfile, not assumed, and the projects submodule's suites re-run. See task 8-002 requirement 4.

### New to dev-core

- `@liquid-labs/condition-eval` `^1.0.0-alpha.17` — used once, `extractParameters` in `_lib/prepare-questions-from-controls.mjs`.
- `@liquid-labs/plugable-defaults` `^1.0.0-alpha.4` — `PLUGABLE_PLAYGROUND()` in four files (`resume.mjs`, `projects/_lib/remove-lib.mjs`, `_lib/pause-lib.mjs`, `_lib/work-db.mjs`).

### Not carried across

- `@liquid-labs/liq-projects-lib` `^1.0.0-alpha.12` — **removed by phase 7 task 002** (W4). dev-core must never carry it; that is the whole point of the special scope item.
- `@liquid-labs/terminal-text` `^1.0.0-alpha.1` — **declared but unused.** `grep -rni "terminal" src/` matches only local identifiers named `terminalFormatter`/`terminal`; there is no import of the package anywhere.
- `octokit` `^2.0.14` — **declared but unused directly.** No `from 'octokit'`, no `require('octokit')`, no case-insensitive `Octokit` reference outside `octocache`. It arrives transitively via `@liquid-labs/octocache`, which declares `octokit ^2.0.14` itself.

### Undeclared but used — a real defect

**`http-errors` is imported by 16 modules and is not in `package.json`.** It resolves today only because npm hoists it from `@liquid-labs/octocache` (whose own dependencies are `{ http-errors ^2.0.0, octokit ^2.0.14 }`). A dependency-tree change that stops hoisting it breaks `@liquid-labs/liq-work` at import time.

Consequence for the merge: **benign in dev-core, still a defect in liq-work.** liq-projects and plugable-projects-audit both declare `http-errors ^2.0.0`, so dev-core carries it properly regardless. Declaring it in liq-work is a one-line, behavior-neutral packaging fix that the retirement release could reasonably carry; it is written up as an explicit decision point in task 9-003 rather than silently applied.

## W4 — `crossLinkDevProjects`: the special scope item, verified

The wave manifest's claim is **confirmed in full** by reading both repositories.

- **It exists**: `liq-projects-lib/src/cross-link-dev-projects.mjs`, 56 lines, one exported function.
- **liq-work imports it exactly once**: `src/handlers/work/_lib/work-db.mjs:13`, `import { crossLinkDevProjects } from '@liquid-labs/liq-projects-lib'`.
- **That is liq-work's *only* use of `liq-projects-lib`.** `grep -rn "liq-projects-lib" src/` returns that one line and nothing else.
- **One call site**: `work-db.mjs:90`, inside `WorkDB#addProjects`, guarded by `if (noLink !== true)`, passing `{ app, projects: allProjects, reporter }`.
- **Sole consumer playground-wide**: a repo-wide grep for `crossLinkDevProjects` (excluding `node_modules`, `.yalc`, `dist`, `test-staging`) matches only its own definition, its own test, and liq-work's two lines.
- **Sibling functions confirm the leave-shared/move-single-use split**: `determineCurrentMilestone` has exactly one consumer, `liq-integrations-issues-github/src/create-or-update-pull-request.mjs:3` (the sibling `core-server-domain-consolidation` plan-group's business). `updatePackageJSON` has **zero** consumers anywhere — it is dead code, which is `liq-projects-lib`'s own slice's finding to act on, not this slice's.
- **npm dependents of `@liquid-labs/liq-projects-lib`**: exactly two, `liq-work` and `liq-integrations-issues-github`.

### Inlining is dependency-neutral

`crossLinkDevProjects` imports only:

| Import | Already a liq-work dependency? |
|---|---|
| `node:path` | built-in |
| `readFJSON` from `@liquid-labs/federated-json` | yes, `^1.0.0-alpha.33` |
| `tryExec` from `@liquid-labs/shell-toolkit` | yes, `^1.0.0-alpha.3` |

So the inlining **adds no dependency and removes one**. It also touches nothing else: the function reads `app.ext._liqProjects.playgroundMonitor.getProjectData(...)` — the D7-frozen key liq-work already uses in eleven other modules — and shells out to `yalc publish` / `yalc add`.

Target location: `src/handlers/work/_lib/cross-link-dev-projects.mjs` (→ `src/work/handlers/_lib/cross-link-dev-projects.mjs` after the restructure), matching the `_lib` convention every other shared helper in this package follows.

`liq-projects-lib` ships a test for it (`src/test/cross-link-dev-projects.test.js`, one case, tracked plain-file fixture at `src/test/data/orgA/proj1/package.json`) which ports cleanly and should come along — it is the only test coverage this function has ever had, and liq-work would otherwise inherit an untested 56-line function.

## W5 — Validation baseline, measured (and it is not green)

Run on Node **v26.5.0**, npm 11.17.0, at `cc3e67f`:

| Target | Result |
|---|---|
| `make build` | **pass** — `dist/liq-work.js` (81 KB) + source map produced from `src/index.js` |
| `make lint` | **pass** — clean, zero findings |
| `make test` | **FAIL** — `Test Suites: 1 failed, 1 passed, 2 total` / `Tests: 6 passed, 6 total` |
| `make qa` | **FAIL** (depends on `test`) |

**The committed `qa/unit-test.txt` says 2 suites / 7 tests passing. It is stale** (recorded at `d79173b`, on an older Node). `/qa` is gitignored here, so that report is a leftover artifact, not a committed baseline. **Use the measured numbers above, not the file.**

### D1 — `work-db.test.js` cannot run on Node ≥ 24 (pre-existing, environment-wide)

```
FAIL handlers/work/_lib/test/work-db.test.js
  ● Test suite failed to run
    TypeError: Cannot read properties of undefined (reading 'prototype')
      at node_modules/buffer-equal-constant-time/index.js:37:35
```

Chain: `work-db.mjs` → `@liquid-labs/github-toolkit` → `@liquid-labs/octocache` → `octokit` → `@octokit/app` → `@octokit/auth-app` → `universal-github-app-jwt` → `jsonwebtoken@9.0.0` → `jws` → `jwa` → `buffer-equal-constant-time@1.0.1`, which does `var origSlowBufEqual = SlowBuffer.prototype.equal`. `SlowBuffer` was removed from `node:buffer` in Node 24; on Node 26 it is `undefined`.

**This is not liq-work's defect and not this plan's to fix, but this plan cannot pretend it away:**

1. **It also breaks loading the built bundle.** `node -e "require('./dist/liq-work.js')"` throws the same error. `@liquid-labs/liq-work` **cannot be loaded as a plugin on this Node at all** — which means the "load the bundle and diff the route list" parity check that the liq-projects and liq-orgs absorb tasks prescribe does not work for this donor without help. Every task in this plan that needs the route list must preload a `SlowBuffer` shim:

   ```js
   // slowbuffer-shim.cjs
   const buffer = require('node:buffer')
   if (buffer.SlowBuffer === undefined) {
     buffer.SlowBuffer = function SlowBuffer (n) { return Buffer.allocUnsafeSlow(n) }
     buffer.SlowBuffer.prototype = Object.create(Buffer.prototype)
   }
   ```

   `node --require ./slowbuffer-shim.cjs -e "…"` was used to produce W1's table and works. The shim is a **measurement aid only** — it must never be committed into `src/` of either repository.

2. **It is already inbound to dev-core from `liq-projects`, before liq-work touches anything.** Measured at `liq-projects` `main`: `make test` → `Test Suites: 5 failed, 3 passed, 8 total` / `Tests: 14 passed`, every failure the identical `SlowBuffer` error. The lead slice's recorded pre-condition ("8 suites / 29 tests passing, per the committed `qa/` reports") reads a stale committed report and is **not reproducible in this environment**. See correction C5 and the flag to the manager.

3. **`buffer-equal-constant-time` has no fixed release** — `npm view` shows only `1.0.0` and `1.0.1`. Remedies, none of which belong to this plan: an npm `overrides` entry pinning a patched build; upgrading the `octokit` chain past `@octokit/auth-app`'s `jsonwebtoken` (blocked by `@liquid-labs/octocache` pinning `octokit ^2.0.14`); or a Jest `setupFiles` polyfill. A decision is wanted from the manager.

### D2 — the surviving test fixture is not in git

`src/handlers/work/_lib/test/data/playground/orgA/proj1` is tracked as **mode `160000` — a gitlink** (commit `4805e78`) with **no `.gitmodules` entry**. `git submodule status` errors with `no submodule mapping found`. The directory's real content — `package.json` (`{"name": "@orgA/proj1"}`) and a nested `.git/` on branch `orgA/proj1/1` — exists only in this working tree, created in 2023.

Proved, not inferred:

- `git clone --no-hardlinks <liq-work> /tmp/lw-clone` produces an **empty** `…/orgA/proj1/` directory.
- A rehearsal `git merge --allow-unrelated-histories` of `liq-work/main` into a clone of `sdlcforge/dev-core` carries the gitlink entry across verbatim and materialises the same **empty** directory.

`determine-projects.test.js` — the one suite that passes today — needs that content. Of its five `test.each` rows, three call `determineProjects` with `workKey === undefined`, which routes into `determineCurrentBranch({ projectPath: currDir })`, implemented in `@liquid-labs/git-toolkit` as ``tryExec(`cd '${projectPath}' && git branch | grep '*' | cut -d' ' -f2`)`` — i.e. it needs a **real git repo with at least one commit, on branch `orgA/proj1/1`**. Two more rows call `getPackageJSON(currDir)` and need `proj1/package.json`.

It passes today only because the Make data-copy rule (`find $(SRC) -type f \( -path "*/test/data/*" … \)`) descends into the untracked nested `.git/` and copies its internals into `test-staging/`, reconstituting a working repo there. Confirmed: `test-staging/handlers/work/_lib/test/data/playground/orgA/proj1/.git/HEAD` contains `ref: refs/heads/orgA/proj1/1`.

**Therefore: absorb liq-work as-is and `determine-projects.test.js` fails in dev-core** — and, worse, would fail *silently wrong* rather than loudly in some arrangements, because a fixture directory with no `.git` inside a checkout resolves `git branch` against the **enclosing repository** and returns *its* current branch. Phase 7 task 001 exists to fix this before the migration, and it is a genuine improvement to liq-work independent of the merge: the suite currently cannot pass in a fresh clone of liq-work either.

The sibling empty directory `…/orgA/proj2/` is untracked (git does not track empty directories) and is never read — row 4 passes `['orgA/proj2']` but with `all: true`, which overrides it. Inert; leave it.

### What validation this plan can actually rely on

Coverage is 3.2% of statements. Both suites together exercise `determine-projects.mjs` (92%) and a sliver of `work-db.mjs` (13%); **every one of the 30 handlers and all 20 `_lib` modules are at 0%.** As in the liq-orgs slice, **the test suite cannot detect a relocation regression.** The real gates are static: file census, `git diff -M` purity, the 30-route/method parity diff, the exported-shape assertion, and the `app.ext`/path-var assertions against a stub app.

## W6 — Consumer inventory

**npm dependents: exactly one.** `grep -rln '"@liquid-labs/liq-work"' --include=package.json` across the whole playground (excluding `node_modules`, `.yalc`, and liq-work's own copies) matches only `sdlcforge/core-server/package.json`. D10's "the only npm dependent of any donor is core-server" **does hold for liq-work** (unlike liq-orgs — C2).

**No other donor, and no sibling plan-group participant, imports liq-work.** Verified across `liq-projects`, `liq-orgs`, `plugable-projects-audit`, `liq-projects-lib`, `liq-integrations-issues-github`, `liq-controls`, and `liq-handlers-lib` — zero matches in `package.json` or `src/`. Despite liq-work being the donor most *coupled* to another donor at runtime, that coupling is entirely `app.ext`-mediated (W7) and creates **no** import edge, so D2 rule 4 holds and this slice's absorption stays order-independent of the other three.

`core-server`'s exact surface:

| File | Line | Content |
|---|---|---|
| `package.json` | 48 | `"@liquid-labs/liq-work": "^1.0.0-alpha.9"` — a **registry range**, not a `file:.yalc/` link (same shape as liq-orgs, unlike liq-projects) |
| `src/lib/app-init.mjs` | 39 | `'@liquid-labs/liq-work',` in `explicitPlugins` |
| `docs/architecture.md` | 23, 51 | narrative mentions in the plugin-tier description |
| `docs/architecture/plugin-loading-tiers.md` | 58 | row 6 of the explicit-plugin table |
| `test/README.md` | 110 | listed under the packages the test harness expects |
| `CLAUDE.md` | 49 | narrative mention |
| `src/lib/test/golden-api-spec.test.js` | 44 | a **comment** naming liq-work as a package that "still reads `app.ext.serverHome`" — **stale**; see W7 |

No core-server **test fixture** names liq-work (unlike liq-projects's three). Executing any of these edits belongs to `core-server-domain-consolidation`, per D11.

## W7 — `app.ext` contracts, and two README corrections

liq-work's `setup({ app, reporter, registerPathVar })` (synchronous; returns `undefined`) does exactly two things:

1. `app.ext.constants.WORK_DB_PATH = fsPath.join(app.ext.serverConfigRoot, 'work', 'work-db.yaml')`
2. `registerPathVar('workKey', { optionsFetcher, validationRe: 'work-[^/]+(?:/|%2[Ff])[^/]+(?:/|%2[Ff])[0-9]+' })` — the `optionsFetcher` constructs a `WorkDB` and returns `getWorkKeys()`

Both are D7-frozen. Note the ordering consequence: the `optionsFetcher` is a **closure**, invoked lazily by the framework, so it does not read `WORK_DB_PATH` at setup time. D6's placement of `work` third in the composite setup order is therefore not forced by anything liq-work does at setup time; it is forced by nothing at all, and is safe to keep exactly as D6 states.

Keys liq-work **reads** (never writes), by census over `src/`:

| Key | Reads | Owner | Guarded? |
|---|---|---|---|
| `app.ext._liqProjects.playgroundMonitor` | 20 (`getProjectData` ×17, `listProjects` ×2, `getProjectsData` ×1) | `liq-projects` (→ dev-core `src/projects/`) | **No.** Unconditional, no fallback. |
| `app.ext.credentialsDB` | 7 | `liq-credentials` / `liq-credentials-db` | No |
| `app.ext.integrations` | 7 (`callHook` ×6, `hasHook` ×1) | **`plugable-express` itself** — see correction | Partially |
| `app.ext.serverConfigRoot` | 1 (in `setup`) | `plugable-express` | n/a |

**Correction to liq-work's README (i):** the README says `app.ext.integrations` is "registered by `liq-integrations`". It is now set by the framework — `plugable-express/src/app.js:112` does `app.ext.integrations = new IntegrationsManager()`. `@liquid-labs/liq-integrations` (retired under Wave 1's `framework-consolidation`) also still does so at `src/setup.mjs:9`, but it is **not** in core-server's `explicitPlugins` list any more. So this dependency is satisfied by the engine, not by a co-loaded plugin. The README's characterisation of the *guard* is accurate: `submit-lib.mjs:94` checks `hasHook({ providerFor: 'controls', hook: 'getQuestionControls' })` and returns `{}` when false — but it guards the *hook*, not the presence of `app.ext.integrations`, which it dereferences unconditionally.

**Correction to core-server (ii):** `golden-api-spec.test.js:44`'s comment names liq-work among packages that "still read `app.ext.serverHome`". **liq-work does not.** `grep -rn "serverHome" src/` returns nothing; `setup.mjs:6` reads `app.ext.serverConfigRoot`. liq-work was migrated by an earlier plan and the comment is stale. Worth naming in the consumer handoff so nobody "fixes" a non-problem during the repoint.

The README's core claims are otherwise **verified accurate**: the 30 routes, the `WorkDB` YAML record shape, the unconditional `_liqProjects` coupling, and the `workKey`-equals-`workBranch` identity. It is the best documentation any of the four donors has and should be **ported into dev-core** (D-per-liq-orgs-precedent), not rewritten from scratch.

### An inconsistency worth documenting, not fixing

liq-work resolves the playground **two different ways**: through `app.ext._liqProjects.playgroundMonitor` (20 reads) and directly through `PLUGABLE_PLAYGROUND()` from `@liquid-labs/plugable-defaults` (4 reads, including `WorkDB#playgroundPath`). Once both submodules live in one package these are two sources of truth for the same value inside one plugin. `WorkDB`'s `#playgroundPath` field is in fact **assigned and never read** — dead. D11 forbids fixing either; both are worth recording as Wave 3/4 follow-ups.

## W8 — Corrections and extensions to the shared foundation

Numbering continues from the liq-orgs slice's C1–C3.

- **C1 restated correctly (not a new finding, but this plan must not repeat the original wording).** `dev-core-target-shape.md` D10 argues against a re-export shim because Express would "silently shadow" duplicate registrations. That is **wrong**: `plugable-express` throws, loudly, at startup. Re-verified from source for this slice: `src/lib/path-var-registry.mjs:28-34` throws ``Path variable '${varName}' is already registered.``, and `src/lib/register-handlers.js:129-131` throws ``Non-unique command path: ${commandPath.join('/')}``. The path-var throw fires first because `load-plugins.js:29` invokes `setup` eagerly while deferring handler registration into `app.ext.pendingHandlers`. D10's **conclusion is unchanged and strengthened** — no shim, atomic swap — but the observable symptom is a crash, and for liq-work specifically the first error a non-atomic swap produces is `Path variable 'workKey' is already registered.`

- **C4 — the D3 drop list must include the donor's `plan/` directory.** Rehearsed merge output: `plan/manifest.yaml`, `plan/plan-summary-modernization-foundation.md`, and `plan/plan-summary-pluggable-defaults-rename.md` all arrive **cleanly** (no conflict, so nothing prompts you to look at them) and would silently land Flow plan artifacts in dev-core. The liq-orgs absorb task already caught this and lists `plan/manifest.yaml`; **the liq-projects absorb task (phase 2 task 002), which runs first, does not** — and liq-projects has `plan/manifest.yaml` and `plan/plan-summary-modernization-foundation.md` too. Flagged to the manager; handled defensively here regardless.

- **C5 — the plan-group's stated validation baselines are not reproducible in this environment.** `liq-projects`'s overview records "make test 8 suites / 29 tests passing" from committed `qa/` reports; measured today it is **5 failed / 3 passed suites, 14 tests**, every failure the Node-26 `SlowBuffer` error (W5/D1). Any task in **any** of the five slices that gates on "`make test` green" or on reproducing those counts will halt. This slice's tasks are written against measured numbers and against a "no *new* failures beyond the known `SlowBuffer` set" rule instead.

- **C6 — D4's "the move is a pure `git mv`" does not survive a gitlink.** The absorption mechanic assumes the donor's `src/` is ordinary tracked content. liq-work's is not (W5/D2): one entry is a gitlink whose contents live outside git entirely, and `git` will refuse to track files beneath it while the nested `.git/` exists (verified: `git add proj1/package.json` → `error: … is in submodule`). D4 is not wrong, but it is incomplete; a donor must be checked for `git ls-files -s src | grep '^160000'` **before** its restructure task is written. `plugable-projects-audit`, planned next, should run that check.

## W9 — Surfaced pre-existing defects (none fixed by this plan, per D11)

| # | Defect | Evidence | Disposition |
|---|---|---|---|
| 1 | `work-db.test.js` cannot run, and `dist/liq-work.js` cannot be `require`d, on Node ≥ 24 | W5/D1 | Environment-wide, affects liq-projects too; **flagged to manager**, not fixed |
| 2 | Test fixture `…/playground/orgA/proj1` is a gitlink with untracked content; the suite cannot pass in a fresh clone | W5/D2 | **Fixed by phase 7 task 001** — it is a hard prerequisite for the migration |
| 3 | `http-errors` used in 16 modules, undeclared in `package.json` | W3 | Benign in dev-core; explicit decision point in task 9-003 for liq-work's final release |
| 4 | `@liquid-labs/terminal-text` and `octokit` declared and unused; `WorkDB#playgroundPath` assigned and never read; two competing playground-resolution paths | W3, W7 | Recorded as Wave 3/4 follow-ups; **not** fixed |
