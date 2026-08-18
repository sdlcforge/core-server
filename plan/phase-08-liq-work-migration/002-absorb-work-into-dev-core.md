# Absorb Work Into Dev-Core

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`), not in `liq-work`.

Bring the restructured `liq-work` tree into `@sdlcforge/dev-core` as the `src/work/` submodule, with liq-work's git history preserved, its runtime dependencies unioned in, the aggregator wired with `work` third in the composite setup order, all 30 `/work` routes present, and the `/work` surface plus the `WORK_DB_PATH`/`workKey` contracts documented.

This is the **third** run of the absorption recipe that `liq-projects` phase 2 task 002 established and `liq-orgs` phase 5 task 002 repeated. **Read `docs/dev-core-consolidation-contract.md` first and follow it where it differs from this document**; where this document is more specific (the file list, the dependency ranges, the parity numbers), this document governs.

It is also the **hardest** run, for four reasons this task must handle explicitly rather than discover:

1. liq-work is the largest donor — 69 source files, 30 handlers.
2. It is the only donor whose dependency ranges genuinely collide with an already-absorbed donor's, and in one case **liq-work's range is higher**, so D4's "take the higher range" rule actually fires and effectively upgrades the `projects` submodule.
3. Its `plan/` directory arrives **cleanly** — no conflict to alert you — and would silently land Flow plan artifacts in dev-core (correction C4).
4. dev-core's `make test` is **not green when this task starts** and will not be green when it ends, because of a pre-existing Node ≥ 24 defect inherited from `liq-projects`. The gate is "no *new* failures", and getting that wrong in either direction wastes the task.

## Requirements

1. **Verify the prerequisites before touching anything.** Halt rather than improvise if any is missing.
   - **`liq-projects` phase 1 has landed in dev-core**: `docs/dev-core-consolidation-contract.md`, an authored `package.json` with a non-empty `description`, `Makefile`, `make/*.mk` including `make/50-dev-core-js.mk`, `.sdlc-data.yaml`, `.gitignore`, and `src/index.mjs` with its aggregator and ordered-setup shape all exist. **This task scaffolds none of it.** (At plan-authoring time dev-core still had exactly one commit and one tracked file, so expect to check this seriously.)
   - **`liq-work` phase 8 task 001 has landed on the branch you will merge.** Confirm with `git ls-tree -r --name-only liq-work/<branch> -- src` **before** merging: it must show `src/work/…` and `src/index.js`, and must **not** show `src/handlers/…` or `src/docs/…`. Merging a pre-restructure tree writes files at the wrong paths and is painful to undo.
   - **Phase 7 landed too** — `git ls-tree -r liq-work/<branch> -- src | grep '^160000'` returns nothing, and `src/work/handlers/_lib/cross-link-dev-projects.mjs` is present. If the gitlink is still there, halt: absorbing it puts an unresolvable submodule reference into dev-core.
   - **Record dev-core's pre-merge baseline** before you change anything: `make build`, `make test`, `make lint` output, with the exact suite/test counts and the exact set of failing suites. Every "no new failures" judgement later depends on this number being real.

2. **Establish the merge.** From the dev-core task worktree:
   - `git remote add liq-work /Users/zane/playground/liquid-labs/liq-work` (a local path remote; no network) and `git fetch liq-work`.
   - `git merge --allow-unrelated-histories --no-commit liq-work/<branch>`, then resolve deliberately. `-X ours` would auto-resolve the root-file conflicts and is acceptable, but `--no-commit` plus explicit resolution keeps the arrival set visible — which matters more here than for either sibling, because requirement 3's most dangerous items arrive **without** conflicting.

3. **Resolve root-level paths in dev-core's favor, and drop donor package-level files** (D3). dev-core's version of every root path wins byte-for-byte.

   **Expected conflicts** (rehearsed against dev-core's pre-phase-1 state; expect these once phase 1 has landed): `package.json` (resolve to dev-core's, *then* apply requirement 4), `package-lock.json`, `.gitignore`, `Makefile`, `README.md`.

   **Expected clean arrivals that must be removed with `git rm`:**
   - `src/index.js` — liq-work's thin re-export; dev-core's `src/index.mjs` supersedes it.
   - `plan/manifest.yaml`
   - `plan/plan-summary-modernization-foundation.md`
   - `plan/plan-summary-pluggable-defaults-rename.md`

   **The `plan/` directory is the trap.** It arrives with no conflict, so nothing prompts you to look at it, and Flow plan artifacts have no business in dev-core. `git rm -r plan/` and then confirm `git ls-files | grep '^plan/'` is empty. (This is correction **C4**: the `liq-orgs` absorb task lists it; the `liq-projects` absorb task, which ran first, does **not** — so if `plan/` is already present in dev-core from that earlier absorption, remove it here too and say so prominently in the report.)

   Note three differences from the sibling absorbs, all of which mean *less* work: liq-work has **no `make/*.mk`**, **no `.sdlc-data.yaml`**, **no `.catalyst-data.yaml`**, and **no `docs/`** — it is on the older monolithic-`Makefile` toolchain generation. Its only `make`-adjacent file is the root `Makefile`, which conflicts and loses.

   Verify the actual conflict/arrival set against this list and report any difference; do not silently accept an unexpected file.

4. **Union the dependencies — and handle the one real collision.** liq-work declares 14 runtime dependencies. Nine overlap with an already-absorbed donor; per D4, take the higher range.

   | Package | liq-work | Already in dev-core | Action |
   |---|---|---|---|
   | `@liquid-labs/github-toolkit` | **`^1.0.0-alpha.25`** | projects `^1.0.0-alpha.20` | **raise dev-core to `^1.0.0-alpha.25`** |
   | `@liquid-labs/federated-json` | `^1.0.0-alpha.33` | projects `^1.0.0-alpha.34` | keep dev-core's |
   | `@liquid-labs/git-toolkit` | `^1.0.0-alpha.14` | projects `^1.0.0-alpha.16` | keep dev-core's |
   | `@liquid-labs/http-smart-response` | `^1.0.0-alpha.3` | projects `^1.0.0-alpha.6` | keep dev-core's |
   | `@liquid-labs/liq-handlers-lib` | `^1.0.0-alpha.13` | orgs `^1.0.0-alpha.17` | keep dev-core's |
   | `@liquid-labs/shell-toolkit` | `^1.0.0-alpha.3` | projects `^1.0.0-alpha.10` | keep dev-core's |
   | `@liquid-labs/liq-qa-lib` | `^1.0.0-alpha.9` | projects, identical | no change |
   | `@liquid-labs/npm-toolkit` | `^1.0.0-alpha.21` | projects, identical | no change |
   | `@liquid-labs/octocache` | `^1.0.0-alpha.4` | projects, identical | no change |

   **Add, new to dev-core:** `@liquid-labs/condition-eval ^1.0.0-alpha.17` and `@liquid-labs/plugable-defaults ^1.0.0-alpha.4`.

   **Do not add:**
   - `@liquid-labs/liq-projects-lib` — **removed by phase 7 task 002 and must never reach dev-core.** If `grep -rn "liq-projects-lib" src/ package.json` matches anything after the merge, phase 7 task 002 did not land; halt.
   - `@liquid-labs/terminal-text ^1.0.0-alpha.1` — declared but **unused** (verified: no import anywhere in liq-work's `src/`).
   - `octokit ^2.0.14` — declared but **unused directly** (no `from 'octokit'`, no `require('octokit')`); it arrives transitively via `@liquid-labs/octocache`, which declares it.

   Record both omissions in the report as deliberate. If your own grep contradicts either, add the dependency and say so.

   **`http-errors` is used by 16 liq-work modules and is undeclared in liq-work's `package.json`** — it resolves today only by hoisting from `octocache`. dev-core already carries `http-errors ^2.0.0` from `liq-projects`, so no action is needed; **verify** it is present and record that you did.

   **The `github-toolkit` raise needs its own verification, because it is the only place in this whole plan-group where a donor's absorption changes an already-absorbed submodule's resolved dependency.** After `npm install`: confirm `package-lock.json`'s resolved `@liquid-labs/github-toolkit` version, state whether it actually changed (under a caret range on a `1.0.0-alpha.x` line npm may well already have been resolving `alpha.25`, making the union a lockfile no-op — but *verify*, do not assume), and re-run the `src/projects/` suites specifically, comparing against requirement 1's baseline. If the raise breaks a `projects` suite, **halt and report** rather than pinning back — that is a manager decision, not a task decision.

5. **Wire the aggregator, third in the setup order.** In `src/index.mjs`: import `./work`, spread its `handlers` into the exported array, and place its `setup` **third** in the ordered setup list — after `projects` and `orgs`, before `projects-audit` (which has none) — per D6.

   Build a **fresh** merged handlers array (`[...projectsHandlers, ...orgsHandlers, ...workHandlers, …]`) per D5. liq-work's own `src/work/handlers/index.js` already builds a plain literal array with spreads and has **no `handlers.push(...)` side-effect style**, so it composes cleanly; do not introduce one.

   **Two corrections to D6's stated rationale, which matter for how you validate this:**
   - D6 says `work` "reads `app.ext.serverConfigRoot`" as though that ordered it relative to the others. It does — but `serverConfigRoot` is supplied by the **framework** (`plugable-express` passes it into every `setup`), not by another submodule, so nothing about liq-work's setup actually requires `projects` or `orgs` to have run first. Keeping `work` third is correct and matches the contract; just do not conclude that a passing composite-setup smoke test proved an inter-submodule ordering dependency. It proved nothing of the sort, because there isn't one.
   - liq-work's `setup` is **synchronous** and returns `undefined`. The composite `await` is a harmless no-op, exactly as for `orgs`.

6. **Apply the C1 correction if the contract still carries the wrong mechanism.** `docs/dev-core-consolidation-contract.md` may still argue against a re-export shim on the grounds that Express would "silently shadow" duplicate registrations. It would not: `plugable-express` **throws**, at `src/lib/path-var-registry.mjs:28-34` (``Path variable '${varName}' is already registered.``) and at `src/lib/register-handlers.js:129-131` (``Non-unique command path: ${commandPath.join('/')}``), with the path-var throw firing first because `load-plugins.js:29` runs `setup` eagerly while deferring handler registration. The conclusion — no shim, atomic swap — is unchanged and **strengthened**. If the contract is already correct (the `liq-orgs` slice was asked to fix it too), say so and change nothing.

7. **Port the documentation.** liq-work's `README.md` is the **best documentation any of the four donors has** — an accurate domain model, the complete 30-route table with its explicit/implied pairing, and a correct account of the `app.ext` couplings. Bring its substance into dev-core (`README.md` and/or a `docs/` page, following whatever structure the `projects` and `orgs` absorptions established), rewritten in dev-core's voice: routes are now served by `@sdlcforge/dev-core`, `src/…` paths are the new submodule paths.

   Three content corrections must be applied while porting — do not copy these through:
   - The README says `app.ext.integrations` is "registered by `liq-integrations`". It is now set by the **framework**: `plugable-express/src/app.js:112` does `app.ext.integrations = new IntegrationsManager()`. `@liquid-labs/liq-integrations` was retired under Wave 1 and is no longer in core-server's `explicitPlugins`.
   - The README's "Modernization status" section, which speculates about a future merge, is now history; replace it with a statement of what actually happened.
   - The README describes the `app.ext.integrations` guard accurately, but be precise in dev-core's version: `submit-lib.mjs:94` guards the **hook** (`hasHook({ providerFor: 'controls', hook: 'getQuestionControls' })`), not the presence of `app.ext.integrations`, which it dereferences unconditionally.

   Also document, because nothing else does: `app.ext.constants.WORK_DB_PATH` (value `<serverConfigRoot>/work/work-db.yaml`, D7-frozen), the `workKey` path var with its `validationRe` and its **lazy** `optionsFetcher` closure, and the fact that `src/work/` reads `app.ext._liqProjects.playgroundMonitor` in **20 places, unconditionally and unguarded** — which is the single most important thing a future reader of dev-core needs to know about the `work`/`projects` submodule relationship, and the reason the Wave 4 unification is worth doing.

   If `docs/architecture.md` already exists (from `liq-projects` phase 4), extend it with the `work` submodule rather than creating a parallel document.

8. **Verify green — against the right definition of green — and record the numbers.** `npm install`, `make build`, `make test`, `make lint`, `make qa`, with observed counts written into the task document's status notes **alongside requirement 1's pre-merge baseline**. See `## Assumptions` for why "green" here means "no new failures".

## Validation

- **History preserved.** `git log --follow -- src/work/handlers/_lib/work-db.mjs` reaches commits authored in liq-work before this plan. Same check for `src/work/setup.mjs` and one handler (`src/work/handlers/save.mjs`). A `--follow` that stops at the merge commit means the absorption lost history and must be redone.
- **File census.** `git ls-files src/work | wc -l` equals liq-work's post-restructure count under `src/` **minus one** (the root `src/index.js`, removed) — take the real number from task 8-001's recorded census, not from this document. `find . -path './src/handlers*' -not -path './node_modules/*'` returns nothing. `diff -r` between liq-work's `src/work/` and dev-core's `src/work/` reports **no differences** (this donor needs no post-move content edit, unlike liq-projects's `test-calls-implied.mjs`).
- **No donor package-level file survived.** All of these return nothing: `git ls-files | grep '^plan/'`, `git ls-files src/index.js`, `git ls-files | grep -x '.catalyst-data.yaml'`. `git ls-files Makefile make .sdlc-data.yaml .gitignore README.md` shows exactly dev-core's own set.
- **No gitlink anywhere.** `git ls-files -s | grep '^160000'` returns **nothing** in dev-core. If it does not, phase 7 task 001 did not land and the absorption must be redone from a corrected donor branch.
- **Package identity intact.** `package.json` `name` is `@sdlcforge/dev-core`, `version` unchanged from phase 1, `main` is `dist/dev-core.js`, `description` is dev-core's. `git diff` on those lines relative to the pre-merge state is empty.
- **Dependency union complete and correct.** `@liquid-labs/condition-eval ^1.0.0-alpha.17` and `@liquid-labs/plugable-defaults ^1.0.0-alpha.4` are present; `@liquid-labs/github-toolkit` is `^1.0.0-alpha.25`; `@liquid-labs/liq-projects-lib`, `@liquid-labs/terminal-text`, and `octokit` are **absent** from `dependencies`; `http-errors` is present. `npm ls --depth=0` resolves with no missing/unmet dependency errors; `npm ci --dry-run` (or equivalent) succeeds against the committed lockfile.
- **The `github-toolkit` raise is accounted for.** The report states the pre- and post-union resolved version from `package-lock.json`, and either "unchanged — the caret range already resolved `alpha.25`" or the actual delta plus the re-run `src/projects/` suite results.
- **Build.** `make build` produces `dist/dev-core.js`.
- **Route parity — 30 `/work` routes, and no duplicates anywhere.** Load the built bundle (with the `SlowBuffer` preload shim) and write every `(method, path)` pair to a file. Assert: the 30 `/work` pairs are byte-identical to the pre-absorption liq-work list (`diff` the files mechanically; do not eyeball); the total handler count equals the sum of the submodules absorbed so far; and **no `(method, path)` pair appears twice across the whole merged array**. The fresh-aggregator array is exactly where an accidental duplicate would appear, and per C1 a duplicate crashes any server that loads it.
- **Path vars: `workKey` registered exactly once, and no name registered twice.** Run the composite `setup` against a stub `app` with a recording `registerPathVar` and assert the full registered set is exactly `{projectName, newProjectName, orgKey, newOrgKey, workKey}` for the submodules landed so far, with no duplicates, and `workKey`'s `validationRe` is byte-identical to `work-[^/]+(?:/|%2[Ff])[^/]+(?:/|%2[Ff])[0-9]+`. (`parameterKey` comes from a `liq-orgs` handler `func` at registration time, not from `setup` — correction C3 — so it will not appear in this set.)
- **Setup shape and ordering.** `typeof setup === 'function'`; the composite runs `projects`, then `orgs`, then `work`; and after it returns, `app.ext.constants.WORK_DB_PATH` equals `<stub serverConfigRoot>/work/work-db.yaml`. Assert the key path is exactly `app.ext.constants.WORK_DB_PATH` — the frozen contract.
- **Tests: no new failures.** `make test` reproduces requirement 1's baseline **plus** liq-work's suites, with the set of *failing* suites growing by exactly one — `src/work/handlers/_lib/test/work-db.test.js`, failing with the known `SlowBuffer` `TypeError`. Specifically: `determine-projects.test.js` **passes** (6 tests) and `cross-link-dev-projects.test.js` **passes** (1 test), both from dev-core's own checkout with no manual fixture setup. Confirm the suite count rose by three, not two or four. **A module-resolution failure in any liq-work suite is a regression; the `SlowBuffer` failure is not.**
- **Lint.** `make lint` and `make qa` produce no new findings relative to the baseline.
- **Old-name sweep.** `grep -rn '@liquid-labs/liq-work' src docs README.md` returns nothing (liq-work carried no `npmName` assertion in its tests, unlike liq-projects, so there should be no such string to fix — confirm rather than assume). `grep -rn 'liq-work\.js' . --include='*.md' | grep -v node_modules` returns nothing (the old build artifact name).
- **Documentation gate.** dev-core's docs state the 30-route table, the `WorkDB` record shape, `WORK_DB_PATH`, the `workKey` path var, and the unguarded 20-site `app.ext._liqProjects.playgroundMonitor` coupling — with the three README corrections from requirement 7 applied and none of the stale claims copied through.

## Metadata

architectural_impact: true

## Assumptions

- **Cross-repository commit mechanics.** The task's own worktree is a `liq-work` worktree, but the edits land in the dev-core checkout. Do the work on a dedicated branch in dev-core (e.g. `task/absorb-work-into-dev-core`) rather than committing to dev-core's `main`, and report the dev-core branch and commit SHA — merging that branch is a manager/user step. If a git operation there is refused by the environment's agent-scope guard, **halt and report the exact command** rather than working around it. Precedent: core-server's completed `bun-conversion` task `003`, whose commit landed in `comply-defaults` on its own `task/…` branch.
- **"Green" means "no new failures", not "zero failures".** dev-core's `make test` is already red when this task starts: `liq-projects` contributed 5 failing suites, all with `TypeError: Cannot read properties of undefined (reading 'prototype')` from `buffer-equal-constant-time`, which dereferences `SlowBuffer` — removed from `node:buffer` in Node 24 (this environment runs v26.5.0). liq-work adds one more (`work-db.test.js`) through the same `github-toolkit → octocache → octokit → @octokit/auth-app → jsonwebtoken → jws → jwa` chain. **Do not fix it here**: the remedies (an npm `overrides` pin, an upgrade past `octocache`'s `octokit ^2.0.14` ceiling, or a Jest `setupFiles` polyfill) are all dependency changes D11 forbids, and it is a plan-group-level decision already flagged to the manager.
- **A `SlowBuffer` preload shim is required to load `dist/dev-core.js` at all**, for the same reason. Write it to a scratch path **outside both repositories** and use `node --require <shim> -e "…"`:

  ```js
  const buffer = require('node:buffer')
  if (buffer.SlowBuffer === undefined) {
    buffer.SlowBuffer = function SlowBuffer (n) { return Buffer.allocUnsafeSlow(n) }
    buffer.SlowBuffer.prototype = Object.create(Buffer.prototype)
  }
  ```

  It is a **measurement aid only**. Never commit it, never add it to `src/`, never reference it from `package.json`, the `Makefile`, or any Jest config.
- **`git merge --allow-unrelated-histories` is the sanctioned mechanic** per dev-core's contract. Do not substitute a file copy, a `git subtree` split, or `git filter-repo` — losing history silently is the failure this recipe exists to prevent.
- **The absorbed code carries known defects that must not be fixed here** (D11): the undeclared `http-errors` in liq-work's own manifest, `WorkDB#playgroundPath` assigned and never read, and two competing playground-resolution paths (`app.ext._liqProjects.playgroundMonitor` in 20 places vs `PLUGABLE_PLAYGROUND()` from `@liquid-labs/plugable-defaults` in 4). Document the last one — once both submodules live in one package it is two sources of truth inside one plugin — but do not unify them.
- The dev-core checkout can `npm install` from the registry. A resolution failure is an environment problem to report, not a range to "fix".
- **No other absorption is running against dev-core concurrently.** Task 8-003 is parallel-eligible with this one but must use a separate task worktree.

## References

- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the absorption recipe (authoritative), root-file ownership, dependency-union rule, plugin contract, setup ordering.
- `plan/notes/liq-work-source-inventory.md` — **W2** path mapping, **W3** the full dependency union with the `github-toolkit` collision, **W1** the 30-route table, **W5** the measured baseline and both defects, **W7** the `app.ext` census and the README corrections, **W8** corrections C1/C4/C5/C6.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/phase-02-liq-projects-migration/002-absorb-projects-into-dev-core.md` — the first run of this recipe; read its status notes for the observed conflict set and any corrections it made to the contract.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-05-liq-orgs-migration/002-absorb-orgs-into-dev-core.md` — the second run, and the origin of the `plan/`-directory drop rule.
- `/Users/zane/playground/liquid-labs/liq-work/README.md` — the route table and `app.ext` account to port (with requirement 7's three corrections).
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/register-handlers.js`, `src/lib/path-var-registry.mjs`, `src/lib/load-plugins.js` — the registration mechanics behind the parity check and correction C1.

## Checkpoint hints

- After requirement 1's prerequisite checks and the recorded pre-merge baseline, before adding the remote.
- After the remote is added, fetched, and the fetched tree verified as restructured and gitlink-free — before any merge.
- After the merge is resolved, the `plan/` directory removed, and the file-census / no-donor-root-file / no-gitlink checks pass — before touching `package.json`.
- After the dependency union, `npm install`, the `github-toolkit` lockfile verification, and a successful `make build`.
- After the aggregator wiring, with the 30-route parity diff, the no-duplicate-route check, and the path-var/setup-shape assertions recorded.
- After the documentation port and the C1 contract check, with `make test`/`make lint`/`make qa` run and the observed counts recorded against the baseline.
