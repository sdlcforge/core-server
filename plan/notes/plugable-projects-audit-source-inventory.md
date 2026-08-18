# plugable-projects-audit — Source Inventory

## Purpose and scope

Ground truth for the `plugable-projects-audit` slice of the federated `dev-core-consolidation` plan-group: what this package actually is, its complete file/route/dependency census, the exact path mapping into `@sdlcforge/dev-core`, the measured validation baseline, its full consumer inventory, the pre-existing defects dev-core will inherit, and the corrections **C12–C17** this slice contributes to the shared foundation.

Everything below was read or measured from source on 2026-08-18 against `main` = `c50da02`, Node **v26.5.0**. Commands are given inline so a later reader can re-verify rather than trust. This is an ephemeral plan note; the durable cross-repo reference is `docs/dev-core-consolidation-contract.md` in `sdlcforge/dev-core`.

## A0 — What this package actually is

The dispatch brief had no description for this project and asked for it to be established from source. It is:

**A four-endpoint `plugable-express` plugin that wraps `npm-check-plus` to audit — and auto-fix — a playground project's npm dependencies.** It is *not* a policy/compliance checker in the `liq-controls` family; "audit" here means `npm audit` plus outdated/missing/extraneous dependency analysis. The whole of its logic is two ~30-line library functions.

- `doAudit` (`src/handlers/projects/_lib/audit-lib.mjs`) resolves the project's path, runs `npmCheck({ packageRoot })`, renders it with `generateReport`, and returns it via `httpSmartResponse`.
- `doAuditFix` (`src/handlers/projects/_lib/audit-fix-lib.mjs`) does the same then runs `npmAutoFix` with `dryRun`/`removePackages`/`updateMinimums` and returns `fixReport`.

**It is an explicit `core-server` plugin**, not a standalone CLI or library: `sdlcforge/core-server/src/lib/app-init.mjs:40` lists `'@liquid-labs/plugable-projects-audit'` in `explicitPlugins` (entry 7 of 11), and `docs/architecture/plugin-loading-tiers.md:59` documents it as "Project auditing — auditing a project and applying fixes for audit issues found." So consumer-update work is real, though small (A6).

### Package facts

| Field | Value |
|---|---|
| `name` | `@liquid-labs/plugable-projects-audit` |
| `version` | `1.0.0-alpha.2` — **identical to npm `latest`** (`npm view @liquid-labs/plugable-projects-audit dist-tags` → `latest: '1.0.0-alpha.2'`), so a final release needs a bump |
| `description` | `""` — empty. This is what `plugable-express` reports as the plugin summary today (D5), so the server currently shows this plugin with no summary at all. |
| `main` | `dist/plugable-projects-audit.js` |
| `license` | `UNLICENSED` |
| tracked files | **11** source files under `src/`, plus 12 package-level files. `git ls-files` returns 25 paths in total (including `plan/manifest.yaml`). |
| `files` field | **absent** — see A7 |
| `.catalyst-data.yaml` | **absent** (unlike `liq-projects`) |
| `README.md` | **absent** (like `liq-orgs`; the superseded notice must be *authored*, not rewritten) |
| `docs/` | **absent** — no stale generated HTML to discard |

### Toolchain — byte-identical to `liq-projects`

`devDependencies` are exactly `liq-projects`'s three, at the same ranges (`@liquid-labs/sdlc-resource-babel-and-rollup ^1.0.0-alpha.5`, `-eslint ^1.0.0-alpha.2`, `-jest ^1.0.0-alpha.5`), and `.sdlc-data.yaml` records the same builder version `1.0.0-alpha.5`. Measured: `Makefile` and all seven shared `make/*.mk` files are **byte-identical** to `liq-projects`'s (`diff -q` on each). Only `make/50-plugable-projects-audit-js.mk` differs, and only in the artifact/entry names — dev-core replaces it with `make/50-dev-core-js.mk` per D8. `.gitignore` differs from `liq-projects`'s by exactly one added line, `/.claude`.

**Consequence: this donor has zero toolchain-migration risk and the smallest possible D3 surface.** Nothing in D8 needs adapting.

## A1 — Complete source census and route surface

All 11 tracked files under `src/`:

```
src/index.mjs                                              # 27B: `export * from './handlers'`
src/handlers/index.mjs                                     # 27B: `export * from './projects'`
src/handlers/projects/index.mjs                            # builds the handlers array (plain literal, no push side-effects)
src/handlers/projects/audit.mjs
src/handlers/projects/audit-implied.mjs
src/handlers/projects/audit-fix.mjs
src/handlers/projects/audit-fix-implied.mjs
src/handlers/projects/_lib/audit-lib.mjs
src/handlers/projects/_lib/audit-fix-lib.mjs
src/handlers/projects/_lib/audit-lib.test.mjs              # the only test
src/handlers/projects/_lib/common-audit-path-parameters.mjs
```

### The 4 routes, read out of the built bundle

Measured, not inferred — `node -e "require('./dist/plugable-projects-audit.js')"`:

| # | method | `path` | `help.name` |
|---|---|---|---|
| 1 | `put` | `['projects', ':projectName', 'audit-fix']` | Project audit fix (named) |
| 2 | `put` | `['projects', 'audit-fix']` | Project audit fix (implied) |
| 3 | `get` | `['projects', ':projectName', 'audit']` | Project audit (named) |
| 4 | `get` | `['projects', 'audit']` | Project audit (implied) |

The array order above is the aggregation order in `src/handlers/projects/index.mjs` and must be preserved as-is.

**Module exports: `handlers` only.** `Object.keys(require(bundle))` returns exactly `['handlers']`; `typeof setup === 'undefined'`. **D6 item 4 ("`projects-audit` — no `setup` at all; handlers only") is confirmed by measurement.** Nothing is added to dev-core's composite setup by this absorption, and nothing about the setup ordering contract changes.

### Route-collision check against the other three donors

`projects-audit` mounts under the `/projects` namespace that `liq-projects` owns, so this needs checking rather than assuming. All 19 `liq-projects` paths were listed (`grep -n 'const path' liq-projects/src/handlers`) and compared: `liq-projects` uses `setup`, `update`, `detail`, `document`, `close`, `destroy`, `archive`, `rename`, `create`, and `releases/publish` — **no `audit` and no `audit-fix`**. `liq-orgs` (`/orgs`) and `liq-work` (`/work`) are in different namespaces. **No collision, in either `path` array or `commandPaths` tree position.** D2's decision to keep `projects-audit` a separate submodule from `projects` costs nothing.

### The one test

`src/handlers/projects/_lib/audit-lib.test.mjs` — a single `test()` asserting the shape of `getAuditEndpointParameters`. Its own comment calls it "essentially a placeholder test because it's the easiest way to satisfy the qa requirement". Coverage is 9.28% of statements; both handler libraries' request paths are at 0%.

**Consequence, stated the way the `liq-orgs` slice had to state it: the test suite cannot detect a relocation regression in any migrated behavior.** Validation in this slice therefore leans on static checks — file census, `path`-array equality read from the built bundle, exported-shape assertions — and each task says so.

## A2 — Dependencies, and the union into dev-core

| dependency | range here | already in dev-core (from) | union result |
|---|---|---|---|
| `@liquid-labs/http-smart-response` | **`file:.yalc/@liquid-labs/http-smart-response`** | `^1.0.0-alpha.6` (`liq-projects`) | **keep dev-core's registry range; never carry the `file:` spec in** |
| `@liquid-labs/npm-toolkit` | `^1.0.0-alpha.17` | `^1.0.0-alpha.21` (`liq-projects`, `liq-work`) | keep `^1.0.0-alpha.21` (higher wins, D4 step 3) — **no edit** |
| `http-errors` | `^2.0.0` | `^2.0.0` (`liq-projects`) | identical — **no edit** |
| `npm-check-plus` | `^1.0.0-alpha.5` | — | **add: the single new dependency this absorption contributes** |

**All four declared dependencies are actually imported** (`httpSmartResponse`, `getPackageJSON`, `createError`, `npmCheck`/`npmAutoFix`/`generateReport`/`fixReport`). No unused declarations, and no undeclared imports — every non-relative import in `src/` resolves to one of the four.

So: **this absorption adds exactly one dependency to `@sdlcforge/dev-core`.** See **C13** for why that is a correction to a sibling slice's stated claim.

The `_npm-check-plus.depcheck.ignoreMatches` block in `package.json` is tooling config for this package's own self-audit, not a dependency; it is a package-level file per D3 and is dev-core's to keep or drop (recommendation: drop — dev-core will have its own).

## A3 — The `file:.yalc/` dependency: a live, reproducible blocker (C12)

`package.json` declares `"@liquid-labs/http-smart-response": "file:.yalc/@liquid-labs/http-smart-response"`. This is **committed and published**, not working-tree residue: `sdlcforge/core-server/bun.lock:374` records the exact spec inside the registry-published `1.0.0-alpha.2` metadata, and line 1776 resolves it to `@liquid-labs/http-smart-response@file:.yalc/@liquid-labs/http-smart-response`.

`.yalc/` is gitignored (`.gitignore` line 5), so **it is absent from every fresh clone and every Flow task worktree.** Measured in a throwaway `git clone` of this repository:

1. `npm install` — **reports success** ("added 825 packages"). No error, no warning about the missing link target.
2. It creates a **dangling symlink**: `node_modules/@liquid-labs/http-smart-response -> ../../.yalc/@liquid-labs/http-smart-response`, pointing at a directory that does not exist.
3. `make build` and `make lint` still pass (the dependency is an external in the Rollup bundle and is not linted).
4. **`make test` fails**: `Cannot find module '@liquid-labs/http-smart-response' from 'handlers/projects/_lib/audit-lib.js'` — 1 failed suite, 0 tests run.

The failure mode is the dangerous kind: install succeeds, two of three gates stay green, and only the test gate fails, with an error that reads like a missing package rather than a broken link.

**The remedy was verified end to end, in the same throwaway clone:** set the range to `^1.0.0-alpha.6`, delete `package-lock.json` (the stale lock pins `"resolved": ".yalc/…", "link": true` and *survives* a plain `npm install` after the `package.json` edit — this step is not optional), reinstall. Result: `node_modules/@liquid-labs/http-smart-response` is a real directory at version `1.0.0-alpha.6`, `make test` **1 suite / 1 test passing**, `make lint` clean, `make build` produces the bundle, and the bundle still exports exactly the same 4 handlers with the same 4 `path` arrays.

**This is a defect fix, not a dependency upgrade, so D11 is not engaged.** The `.yalc/` copy on disk *is* `1.0.0-alpha.6` (`.yalc/@liquid-labs/http-smart-response/package.json`), `npm view @liquid-labs/http-smart-response dist-tags` is `latest: 1.0.0-alpha.6`, and `^1.0.0-alpha.6` resolves to that same `1.0.0-alpha.6`. The resolved code is identical; only the resolution *mechanism* changes. The precedent is the `liq-orgs` slice, which was directed to revert a stray `file:.yalc/@liquid-labs/playground-monitor` entry for the same class of reason — the difference being that liq-orgs's was uncommitted and for an unused dependency, whereas this one is committed, published, and load-bearing.

Phase 11 exists to land this before anything else in the slice, because **every later task in this slice runs in a fresh Flow task worktree and would otherwise be unable to run `make test` at all.**

## A4 — Path mapping into dev-core (D2)

Submodule directory: **`src/projects-audit/`**, exactly as D2 specifies.

The naming was re-checked against the actual package name, as the dispatch brief asked. `@liquid-labs/plugable-projects-audit` → `projects-audit` drops the `plugable-` prefix, which denotes "is a `plugable-express` plugin" (the same role `liq-` plays for the other three donors) and is not part of the domain. Every donor drops its framework prefix: `liq-projects`→`projects`, `liq-work`→`work`, `liq-orgs`→`orgs`. `projects-audit` is consistent and is what D2 already fixed; **no deviation.**

D2 rule 2's `handlers/<domain>/` flatten applies: this donor's single nesting level under `handlers/` is `projects/`, and it collapses.

| from | to |
|---|---|
| `src/handlers/projects/index.mjs` | `src/projects-audit/handlers/index.mjs` |
| `src/handlers/projects/audit.mjs` | `src/projects-audit/handlers/audit.mjs` |
| `src/handlers/projects/audit-implied.mjs` | `src/projects-audit/handlers/audit-implied.mjs` |
| `src/handlers/projects/audit-fix.mjs` | `src/projects-audit/handlers/audit-fix.mjs` |
| `src/handlers/projects/audit-fix-implied.mjs` | `src/projects-audit/handlers/audit-fix-implied.mjs` |
| `src/handlers/projects/_lib/audit-lib.mjs` | `src/projects-audit/handlers/_lib/audit-lib.mjs` |
| `src/handlers/projects/_lib/audit-fix-lib.mjs` | `src/projects-audit/handlers/_lib/audit-fix-lib.mjs` |
| `src/handlers/projects/_lib/audit-lib.test.mjs` | `src/projects-audit/handlers/_lib/audit-lib.test.mjs` |
| `src/handlers/projects/_lib/common-audit-path-parameters.mjs` | `src/projects-audit/handlers/_lib/common-audit-path-parameters.mjs` |
| `src/handlers/index.mjs` | **deleted** — the trivial re-export shim D3 names |
| — | **new** `src/projects-audit/index.mjs`: `export * from './handlers'` |
| `src/index.mjs` | stays, reduced to `export * from './projects-audit'` (D4 step A) — **and see A5/C17** |

**Zero import rewrites are required.** Every import in the tree is either a bare package specifier or a same-directory-relative path (`./audit-fix`, `./_lib/audit-lib`, `./common-audit-path-parameters`), all of which survive the move unchanged. Verified by reading all 11 files.

Test discovery survives: `make/20-js-src-finder.mk` classifies by filename (`*.test.*js`) and by `*/test/*`, both depth-agnostic, so `src/projects-audit/handlers/_lib/audit-lib.test.mjs` is still collected. There are no test data files, so `make/15-data-finder.mk` is not involved at all.

Post-restructure census: **11 files under `src/`** (9 relocated + new `src/projects-audit/index.mjs` + the reduced root `src/index.mjs`), i.e. the same count as today, since one file is deleted and one is created.

## A5 — The `src/index.mjs` collision: the one real hazard in this slice (C17)

**This donor's root entry point is `src/index.mjs` — the exact path dev-core's own aggregator occupies.**

Every other donor's root entry is `src/index.js`. Their absorb tasks therefore list it as a *clean arrival to `git rm`*, and D3's drop list says "the donor's root `src/index.*`". Applied literally here, that instruction would **delete dev-core's aggregator.**

What actually happens: `src/index.mjs` exists on both sides with different content and unrelated histories, so `git merge --allow-unrelated-histories` raises it as a **conflict**, not a clean arrival. It must be resolved **in dev-core's favor** (`git checkout --ours -- src/index.mjs`) and then edited to add the `projects-audit` import — the same file the absorb has to touch anyway for D4 step 5.

Why this deserves a dedicated, loud check rather than a footnote: resolving it the wrong way replaces dev-core's merged-handler aggregator with a one-line `export * from './projects-audit'`. Rollup would still build, `make build` would still be green, and the resulting `dist/dev-core.js` would export a valid 4-element `handlers` array and no `setup` — silently dropping every other donor's handlers *and* the composite setup, with no error anywhere. The absorb task's post-condition ("`src/index.mjs` still imports every landed submodule and still exports a composite `setup`") is the only thing standing between that outcome and a green build.

`-X ours` would in fact resolve it correctly, and is acceptable; the explicit post-condition is required regardless.

## A6 — Consumer inventory

`@sdlcforge/core-server` is the **only** consumer, anywhere. Verified by a playground-wide grep for `plugable-projects-audit` across every `package.json`, `*.mjs`, `*.js`, `*.md`, `*.yaml`, `*.sh` outside `node_modules/`, `dist/`, `test-staging/`, and lockfiles. D10's "the only npm dependent of any donor is core-server" **holds here** (unlike `liq-orgs`, C2). No other donor imports or depends on it (independently confirmed by the `liq-orgs` and `liq-work` slices' own sweeps).

The exact touch-points in `/Users/zane/playground/sdlcforge/core-server`:

| file | line | what |
|---|---|---|
| `package.json` | 50 | `"@liquid-labs/plugable-projects-audit": "^1.0.0-alpha.2"` — a **registry range**, not a `file:.yalc/` link |
| `src/lib/app-init.mjs` | 40 | the `explicitPlugins` entry |
| `docs/architecture/plugin-loading-tiers.md` | 59 | tier table row 7 |
| `test/README.md` | 111 | the documented explicit-plugin list |
| `AGENTS.md` | 60 | the yalc-snapshot paragraph, which names this package as the source of the transitive `http-smart-response` `file:.yalc/` resolution |
| `scripts/provision-local-deps.sh` | 8, 31–35, 79 | the header comment, the `REQUIRED_YALC_PACKAGES` array, and the missing-package error text |
| `bun.lock` | 374, 1776 | regenerated, not hand-edited |

**No core-server *test fixture* names this package.** `test/test-basic.js:54` and `test/test-integration-quick.js:61` assert only `liq-controls`, `liq-credentials`, and `liq-projects`. So, like `liq-orgs`, this donor needs no fixture edits — unlike `liq-projects`, which has three.

**The finding unique to this slice: removing this dependency *removes work* from core-server.** `bun.lock:1776` shows `@liquid-labs/plugable-projects-audit/@liquid-labs/http-smart-response` as the **only** reason `@liquid-labs/http-smart-response` is a `file:.yalc/…` resolution in core-server (`plugable-express` declares it too, but at the registry range `^1.0.0-alpha.6`). dev-core will declare it at that same registry range. So after the swap, `REQUIRED_YALC_PACKAGES` drops from three entries to two, `scripts/provision-local-deps.sh`'s comments and error text lose a paragraph, and `AGENTS.md:60`'s "three packages via `file:.yalc/…`" snapshot becomes two. **No other slice's handoff covers this**, and core-server's own docs explicitly ask for that list to be kept in sync.

### Not a consumer, but worth recording

`sdlcforge/core-cli/docs/projects.md` is generated CLI reference documentation that already interleaves all four audit endpoints with `liq-projects`'s under a single `/projects` page, carrying no package provenance. Because the merged plugin keeps every `path` and every `help` string byte-identical, that document **regenerates identically** after the swap. No edit required — but it is also where this package's user-visible typos are on display today (A8).

## A7 — Packaging defect (C9), confirmed and worst-in-group

`package.json` has no `files` field and there is no `.npmignore`, so `npm pack` falls back to `.gitignore` and emits `npm warn gitignore-fallback`.

Measured from the main checkout: **`npm pack --dry-run` lists 50 files.** The published `1.0.0-alpha.2` tarball has **24**. The 26 extra are:

- `.flow/launchers/flow-20260817T192128Z-1081-2773.json` and `.flow/plans/dev-core-consolidation.json` — Flow session metadata containing local absolute paths and a session UUID;
- `plan/manifest.yaml` — a Flow plan artifact;
- **23 files under `worktrees/plan/dev-core-consolidation/`** — a complete nested second copy of the package, including a 403 kB `package-lock.json`.

The reference set is readable without a network call from an installed copy of the published release at `/Users/zane/playground/sdlcforge/core-server/node_modules/@liquid-labs/plugable-projects-audit/`: `dist/` (2 files), `make/` (8), `Makefile`, `package.json`, `.sdlc-data.yaml`, and 11 files under `src/`.

**Remedy: `"files": ["dist", "src", "make", "Makefile", ".sdlc-data.yaml"]`**, which reproduces that 24-file set exactly (npm adds `package.json` and, once it exists, `README.md`). Note that `dist/` is gitignored here yet *is* in the published tarball — so the allowlist must name it explicitly, and "the `.gitignore` already covers it" reasoning is empirically wrong for this repository.

Do **not** substitute an `.npmignore`: it disables the `.gitignore` fallback, so `qa/`, `test-staging/`, `.yalc/`, and `node_modules/` would all need re-listing by hand.

## A8 — Pre-existing defects dev-core will inherit

Migrated as-is under D11. Recorded here, and required to be disclosed in dev-core's documentation and in this package's superseded notice, so that consolidation does not launder known defects into a new package under a new name.

1. **The two *implied* endpoints declare a `projectName` parameter they cannot use.** `getAuditEndpointParameters`/`getAuditFixEndpointParameters` unconditionally spread `commonAuditPathParameters` (which is `[{ name: 'projectName', … }]`) for both the `named` and `implied` variants, but the implied paths (`['projects','audit']`, `['projects','audit-fix']`) carry no `:projectName`; the value comes from the `X-CWD` request header. So the generated API spec and CLI help advertise a parameter that is silently ignored. Commit `7d797ba` ("specified missing pash parameter; updated tests") suggests this was a deliberate patch of a *different* problem that overshot.
2. **A typo suppresses one parameter's help text.** In `audit-fix-lib.mjs`, the `removePackages` parameter object uses the key **`dascription`** instead of `description`. Its (long, genuinely useful) explanation is therefore dropped from the API spec — visibly so: `sdlcforge/core-cli/docs/projects.md` renders `removePackages` without it.
3. **An unknown project name produces a 500, not a 404.** Both libs do `const { projectPath: packageRoot } = await app.ext._liqProjects.playgroundMonitor.getProjectData(projectName)`. `getProjectData` returns `structuredClone(this.#data[name])` — `undefined` for an unknown name (`playground-monitor/src/playground-monitor.mjs:21-25`) — and destructuring `undefined` throws a `TypeError`.
4. **Prose typos in user-facing help text**: `Auidts` (`audit-lib.mjs`), `reomved`, `pacagkes`, `specificatinos`, and a double space in `${workDesc} project  security` (`audit-fix-lib.mjs`). All four are currently published in `core-cli/docs/projects.md`.
5. **`reporter = reporter.isolate()` is dead** in all four handlers — assigned and never read.
6. **`description` is `""`**, so the server reports this plugin with an empty summary today (D5).

None of these is fixed by this plan. Items 1–4 are cosmetic-to-moderate and belong in a follow-up; fixing 1 or 2 changes the published API spec, which is a behavior change D11 forbids inside a consolidation.

## A9 — Measured validation baseline

Run on Node **v26.5.0**, in the main checkout at `main` = `c50da02` (with `.yalc/` present, i.e. the developer's working state):

- `make test` → **1 suite passed, 1 test passed.** Green.
- `make lint` → clean.
- `make build` → `dist/plugable-projects-audit.js` (13,963 B) plus its source map.
- `node -e "require('./dist/plugable-projects-audit.js')"` → loads cleanly; `handlers.length === 4`; `setup === undefined`.

**C15: the plan-group's Node-26 `SlowBuffer` breakage does not reach this donor.** The `liq-work` slice's F1 finding (a removed `SlowBuffer` API breaking `jsonwebtoken → jws → jwa → buffer-equal-constant-time`, reached via `github-toolkit → octocache → octokit → @octokit/auth-app`) is real, and it does affect `liq-projects` and `liq-work` — but none of this package's four dependencies reaches that chain. The same conclusion `liq-projects-lib` reached independently (its C11).

**Consequence for gating:** tasks executing *in this repository* gate on **green**, the `liq-projects` convention — not on `liq-work`'s "no new failures beyond the known set". Tasks executing *in dev-core* must use the "no new failures" rule, because dev-core inherits `liq-projects`'s failures from phase 2 before this slice ever touches it. Each task says which rule applies.

Caveat, and the reason phase 11 exists: **from a fresh clone or task worktree the baseline is *not* green** — `make test` fails with `Cannot find module '@liquid-labs/http-smart-response'` (A3/C12). The green numbers above depend on a `.yalc/` directory that is not in git.

## A10 — Corrections and extensions to the shared foundation

Numbering continues from `liq-projects-lib`'s C7–C11. None of these changes a **decision**; C17 changes an *instruction*, and the rest change stated reasoning or fill gaps. All are carried as explicit requirements in the tasks and flagged to the manager.

- **C12 — a donor ships a `file:.yalc/…` dependency in a *published* release, and it breaks fresh clones.** Detail in A3. The published `1.0.0-alpha.2` declares `"@liquid-labs/http-smart-response": "file:.yalc/…"`. `npm install` in a fresh clone succeeds while leaving a dangling symlink, `make build`/`make lint` stay green, and only `make test` fails. Phase 11 fixes it, verified end to end. This is a defect fix, not a D11-forbidden upgrade: the linked copy, the registry `latest`, and `^1.0.0-alpha.6` all resolve to the identical `1.0.0-alpha.6`.

- **C13 — D4's dependency-union "take the higher range on overlap" fires more often than the `liq-work` slice claimed.** That slice states its `github-toolkit` bump is "the one range in the whole plan-group where D4's 'take the higher range' rule actually fires". This donor overlaps dev-core twice more: `@liquid-labs/npm-toolkit` (`^1.0.0-alpha.17` here vs `^1.0.0-alpha.21` already present — higher wins, so no edit) and `@liquid-labs/http-smart-response` (a `file:` spec vs `^1.0.0-alpha.6`). The second is a case D4 does not anticipate at all: **a `file:` spec must never be unioned into a publishable package**, regardless of which "range" looks higher, because `file:` specs have no ordering and do not survive publication. Net effect of this absorption on dev-core's `dependencies`: **exactly one addition, `npm-check-plus ^1.0.0-alpha.5`.**

- **C14 — `projects-audit` is the only donor with a hard cross-donor dependency at *handler-registration* time, not just at request time.** Two of its four paths contain `:projectName`, and `plugable-express`'s `pathToRe` (`src/lib/path-to-re.mjs:14-19`) **throws** `Unknown variable path element type 'projectName' while processing path projects/:projectName/audit.` when the var is unregistered. Only `liq-projects`'s `setup` registers it (`liq-projects/src/setup.mjs:60`). This does **not** break D4's content-independence — `git merge` does not run anything — but it does constrain *validation*: a registration-based route check in dev-core requires `src/projects/` to have landed, or a stubbed path-var registry. Reading `path` arrays off the built bundle needs neither and is the check this slice prescribes.

  It also explains why nothing breaks *today* despite `plugable-projects-audit` sorting after `liq-projects` in `explicitPlugins` only by luck: `loadPlugin` (`load-plugins.js:29`) runs every plugin's `setup` eagerly and defers *all* handler registration to `app.ext.pendingHandlers`, so every `setup` has run before any path is processed. And it sharpens D10's atomicity requirement for core-server: a swap that leaves `plugable-projects-audit` in `explicitPlugins` while `liq-projects` is gone produces this specific throw at startup, in addition to the duplicate-registration throws of C1.

- **C15 — the Node-26 `SlowBuffer` breakage does not reach this donor.** Detail in A9. Measured green. Gating rules per task accordingly.

- **C16 — the gitlink defect class (the `liq-work` slice's C6) does not reproduce here.** `git ls-files -s | grep '^160000'` returns nothing across the **entire** index, not just `src/` — checked as the dispatch brief directed, before the restructure and absorb tasks were written. There are no test data fixtures at all in this package, which is where `liq-work`'s gitlink lived. D4's "the move is a pure `git mv`" holds here without qualification.

- **C17 — D3's "drop the donor's root `src/index.*`" is *actively dangerous* for this donor.** Detail in A5. This donor's root entry is `src/index.mjs`, colliding exactly with dev-core's own aggregator path; it arrives as a **conflict to resolve in dev-core's favor**, never as a clean arrival to `git rm`. Getting it backwards silently deletes the merged-handler aggregator and the composite `setup`, and still builds green. `docs/dev-core-consolidation-contract.md` should say so; this slice's absorb task carries a defensive check either way.

## References

- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — decisions D1–D11 (ephemeral plan note).
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the durable committed restatement, authored by `liq-projects` phase 1 task 001. Prefer it once it exists.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/phase-02-liq-projects-migration/002-absorb-projects-into-dev-core.md` — first run of the absorption recipe.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-05-liq-orgs-migration/002-absorb-orgs-into-dev-core.md` — second run; origin of C1–C3.
- `/Users/zane/playground/liquid-labs/liq-work/worktrees/plan/dev-core-consolidation/plan/overview.md` — origin of C4–C6 and the `SlowBuffer` finding.
- `/Users/zane/playground/liquid-labs/liq-projects-lib/worktrees/plan/dev-core-consolidation/plan/notes/liq-projects-lib-retirement-inventory.md` — origin of C7–C11, and the `files`-allowlist remedy pattern.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/load-plugins.js`, `src/lib/register-handlers.js`, `src/lib/path-to-re.mjs`, `src/lib/path-var-registry.mjs` — the loader and the two throws behind C1 and C14.
- `/Users/zane/playground/liquid-labs/playground-monitor/src/playground-monitor.mjs` — `getProjectData`'s contract and the `undefined` return behind A8 item 3.
- `/Users/zane/playground/sdlcforge/core-server/src/lib/app-init.mjs`, `scripts/provision-local-deps.sh`, `AGENTS.md`, `bun.lock` — the consumer surface of A6.
