# Absorb Orgs Into Dev-Core

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`), not in `liq-orgs`.

Bring the restructured `liq-orgs` tree into `@sdlcforge/dev-core` as the `src/orgs/` submodule, with liq-orgs's git history preserved, its 4 runtime dependencies unioned in, the aggregator wired with `orgs` second in the composite setup order, dev-core's full build/test/lint green with all 5 `/orgs` routes present — and with the `/orgs` route surface and the `app.ext._liqOrgs` contract written down for the first time.

This is the **second** run of the absorption recipe that `liq-projects` phase 2 task 002 established and, if it hit friction, corrected in `docs/dev-core-consolidation-contract.md`. **Read that contract first and follow it where it differs from this document**; where this document is more specific (the file list, the dependency ranges, the parity numbers), this document governs. If the contract turns out to be wrong again, correct it in the same change and say so prominently in the report, exactly as the first run was asked to.

## Requirements

1. **Verify the prerequisites before touching anything.** This task has two hard dependencies and must halt rather than improvise if either is missing.
   - **`liq-projects` phase 1 has landed in dev-core**: `docs/dev-core-consolidation-contract.md`, `package.json` with authored metadata and a non-empty `description`, `Makefile`, `make/*.mk` including `make/50-dev-core-js.mk`, `.sdlc-data.yaml`, `.gitignore`, and `src/index.mjs` with its aggregator and ordered-setup shape all exist, and `make build`/`make test`/`make lint` are green on the pre-existing submodule set. **This task does not scaffold any of that** — if it is absent, halt and report that phase 1 has not landed.
   - **`liq-orgs` phase 5 task 001 has landed on the branch you will merge.** Confirm with `git ls-tree -r --name-only liq-orgs/<branch> -- src` **before** merging: it must show `src/orgs/…` and `src/index.js`, and must **not** show `src/handlers/…` or `src/resources/…`. If it still shows the pre-restructure layout, halt — merging a pre-restructure tree writes files at the wrong paths and is painful to undo.

2. **Establish the merge.** From the dev-core task worktree:
   - `git remote add liq-orgs /Users/zane/playground/liquid-labs/liq-orgs` (a local path remote; no network involved) and `git fetch liq-orgs`.
   - `git merge --allow-unrelated-histories --no-commit liq-orgs/<branch>`, then resolve deliberately. `-X ours` would auto-resolve the root-file conflicts in dev-core's favor and is acceptable, but `--no-commit` plus explicit resolution keeps the conflict set visible, and comparing it against the set the `liq-projects` absorb reported is a cheap check that the recipe is behaving consistently across donors.

3. **Resolve root-level paths in dev-core's favor, and drop donor package-level files** (D3). dev-core's version of every root path wins byte-for-byte. Expected conflicts: `package.json` (resolve to dev-core's, *then* apply requirement 4), `package-lock.json`, `.gitignore`, `Makefile`, `make/10-locations.mk`, `make/10-resources.mk`, `make/15-data-finder.mk`, `make/20-js-src-finder.mk`, `make/55-lint.mk`, `make/55-test.mk`, `make/95-final-targets.mk`. Expected clean arrivals that must be removed with `git rm`: `src/index.js` (liq-orgs's thin re-export — dev-core's `src/index.mjs` supersedes it), `make/50-liq-orgs-js.mk`, `.catalyst-data.yaml`, and `plan/manifest.yaml` (a Flow plan artifact that has no business in dev-core; also `git rm` anything else that arrives under `plan/`).

   Note two differences from the `liq-projects` absorb, both of which mean *less* work: liq-orgs has **no `README.md`** and **no `.sdlc-data.yaml`**, so neither conflicts; and it has no `docs/` directory, so there is no stale generated HTML to discard. Verify the actual conflict/arrival set against this list and report any difference; do not silently accept an unexpected file.

4. **Union the dependencies.** Add all 4 of liq-orgs's runtime `dependencies` to dev-core's `package.json`, preserving the exact ranges:
   - `@liquid-labs/dependency-runner` `^1.0.0-alpha.8`
   - `@liquid-labs/liq-handlers-lib` `^1.0.0-alpha.17`
   - `@liquid-labs/resource-model` `^1.0.0-alpha.10`
   - `js-yaml` `^4.1.0`

   **None of these overlaps liq-projects's 16**, so the "take the higher range on overlap" rule should not fire. If it does, an earlier absorption diverged from plan — record the choice and say so. Then `npm install` to refresh `package-lock.json`.

   Do **not** add `@liquid-labs/playground-monitor` on liq-orgs's behalf: nothing in `src/orgs/` imports it, and dev-core already carries a proper registry range for it from liq-projects. (liq-orgs's working tree had an unused `file:.yalc/…` entry for it; phase 5 task 001 was directed to revert that.) Do not upgrade anything.

5. **Wire the aggregator, second in the setup order.** In `src/index.mjs`: import `./orgs`, spread its `handlers` into the exported array, and place its `setup` **second** in the ordered setup list — after `projects`, before `work` — per D6.

   Build a **fresh** merged handlers array (`[...projectsHandlers, ...orgsHandlers, …]`) per D5. liq-orgs's own `src/orgs/handlers/index.js` already builds a plain literal array with no `push` side-effects, so it composes cleanly; do not introduce one.

   **Correction to D6's stated rationale, which matters for how you validate this** (finding C3): D6 justifies `orgs` going second because its setup "reads `app.ext._liqProjects.playgroundMonitor.getProjectsData()`." That read actually happens inside the deferred `load orgs` **setup method**, which the *server's* `DependencyRunner` runs long after every plugin's `setup` has returned. liq-orgs's `setup` itself touches only `app.ext.setupMethods` and `registerPathVar`, and is **synchronous** (it returns `undefined`, not a promise — the composite `await` is a harmless no-op). Keep `orgs` second — it is correct and matches the contract — but do not conclude from a passing composite-setup smoke test that the `_liqProjects` dependency was exercised. It was not.

6. **Preserve the `app.ext.setupMethods` contract exactly** (D7). After `setup` runs, exactly three entries must have been pushed, in this order, with these names and `deps`:
   1. `prepare org dependencies`, `deps: ['!']` — assigns `app.ext._liqOrgs = { orgSetupMethods: [] }`
   2. `load orgs`, no `deps`
   3. `process org setup`, `deps: ['*']`

   The `'!'`/`'*'` markers are `DependencyRunner` run-first/run-last semantics and are load-bearing: `load orgs` writes into the object `prepare org dependencies` creates, and `process org setup` consumes `orgSetupMethods` entries that other plugins (`liq-policy`) push during their own setup. Composing four donors into one `setup` must not reorder, dedupe, or filter these pushes.

7. **Document the subsystem — this is authoring, not porting.** Unlike liq-projects, liq-orgs has no README, no `docs/`, and an empty `description`; the `/orgs` route surface and the `app.ext._liqOrgs` contract have never been written down anywhere. Add to dev-core's `README.md` and/or `docs/` (follow whatever structure phase 1 and the `liq-projects` absorb established):
   - The 5-route table with methods and exact paths, in the same form as the `projects` routes.
   - What an "org" actually is here — **not** a free-standing entity, but a *classification of a project*: `setup` scans the projects `liq-projects` already discovered via `app.ext._liqProjects.playgroundMonitor.getProjectsData()` and promotes those whose scanned `package.json` carries `liq.packageType === 'org'`. This is the single most important non-obvious fact about the submodule and exists in no document today.
   - The `app.ext._liqOrgs` contract: `orgs` (a key→`Organization` map, **read** by `liq-controls` in three modules) and `orgSetupMethods` (an array **written** by `liq-policy`), plus the three ordered setup methods and their `deps` markers.
   - The three path vars this submodule registers — `orgKey` and `newOrgKey` from `setup`, and **`parameterKey` from `parameters-detail.mjs`'s handler `func`**. Note the mechanism explicitly: a *handler* can register a path var at registration time, so the merged path-var surface is not determined by reading the `setup` functions alone. (`parameters-set.mjs` carries the same registration commented out, precisely because a duplicate throws.)
   - **The known defects, disclosed rather than buried.** dev-core is inheriting five endpoints that do not work: four throw `TypeError: Cannot read properties of undefined (reading 'orgs')` on first request because they read a `model` argument `plugable-express` no longer passes to plugin handlers, and `create` never sends a response. Migrating them unchanged is the deliberate D11-compliant choice; shipping them silently undocumented is not. State it plainly and link the follow-up.

8. **Apply correction C1 to the contract document, if it is still needed.** Check `docs/dev-core-consolidation-contract.md`'s retirement/no-shim rationale. If it still claims that a duplicate registration is *silently shadowed* by Express, correct it — the source says `plugable-express` fails loudly, in two independent places:
   - `src/lib/path-var-registry.mjs:28-34` — `registerPathVar` throws `` Path variable '<name>' is already registered. ``. This fires **first**, because `loadPlugin` (`load-plugins.js:29`) runs a plugin's `setup` eagerly while deferring handler registration to `app.ext.pendingHandlers`.
   - `src/lib/register-handlers.js:130-132` — `processCommandPath` throws `` Non-unique command path: <path> `` for any array-style `path` registered twice, which is all of them.

   The conclusion (no shim, atomic swap) is unchanged and strengthened; only the mechanism was wrong. If `liq-projects` phase 1 already stated it correctly, change nothing and say so in the report.

9. **Verify green and record the numbers.** `npm install`, `make build`, `make test`, `make lint`, `make qa` — with the observed suite/test counts written into the task document's status notes alongside the pre-absorption baselines they are compared against.

## Validation

- **History preserved.** `git log --follow -- src/orgs/setup.mjs` reaches commits authored in liq-orgs before this plan — the `Migrate to plugable-express registerPathVar API` commit (`d90bc23`) is a good anchor. Run the same check for one handler (`src/orgs/handlers/parameters-detail.mjs`) and for `src/orgs/resources/lib/settings.mjs`. A `--follow` that stops at the merge means the absorption lost history and must be redone.
- **File census.** `git ls-files src/orgs | wc -l` equals **12** — the 11 relocated files plus `src/orgs/index.mjs` — and matches the post-restructure count phase 5 task 001 recorded, minus the root `src/index.js`. Compare against task 001's recorded listing, not against this number alone.
- **No donor package-level file survived.** All of these return nothing: `git ls-files | grep -x '.catalyst-data.yaml'`, `git ls-files | grep 'make/50-liq-orgs-js.mk'`, `git ls-files | grep '^plan/'`. `git ls-files src/index.js` returns nothing (dev-core's entry is `src/index.mjs`). `git ls-files Makefile make .sdlc-data.yaml .gitignore README.md` shows exactly dev-core's own set.
- **Package identity intact.** `package.json` `name` is `@sdlcforge/dev-core`, `version` unchanged from phase 1, `main` is `dist/dev-core.js`, `description` is dev-core's authored one. `git diff` on those lines relative to the pre-merge state is empty.
- **Dependency union complete.** All 4 ranges present and byte-identical to liq-orgs's; liq-projects's 16 still present and unmodified; `npm ls --depth=0` resolves with no missing/unmet dependency errors; `package-lock.json` committed and consistent (`npm ci --dry-run` or equivalent succeeds). `grep -c 'playground-monitor' package.json` shows exactly one entry, at liq-projects's `^1.0.0-beta.4` range.
- **Build.** `make build` produces `dist/dev-core.js`.
- **Route parity — exactly 5 new routes, byte-identical.** Load the built bundle and extract the `path` arrays contributed by the `orgs` submodule. Write them to a file and `diff` mechanically against this expected set:
  - `['orgs', 'create', ':newOrgKey']` (POST)
  - `['orgs', 'list?']` (GET)
  - `['orgs', ':orgKey', 'parameters', ':parameterKey', 'detail']` (GET)
  - `['orgs', ':orgKey', 'parameters', 'list?']` (GET)
  - `['orgs', ':orgKey', 'parameters', ':parameterKey', 'set']` (PUT)

  Also confirm the total `handlers.length` equals the pre-merge dev-core count **plus exactly 5**, so nothing was dropped or duplicated by the aggregator. **This check, not `make test`, is the real gate** — liq-orgs's test suite covers one pure utility module and cannot detect a handler regression.
- **Setup shape, ordering, and `app.ext` contract.** Against a stub `app` with `ext: { setupMethods: [], … }` and a recording `registerPathVar`:
  - `typeof setup === 'function'` and awaiting it resolves.
  - The `orgs` submodule setup ran **after** `projects` and **before** `work`.
  - `registerPathVar` was called with `newOrgKey` and `orgKey`, both carrying `validationRe` `(?:@|%40)[a-z][a-zA-Z0-9-]*`, and `orgKey`'s `optionsFetcher` present.
  - `app.ext.setupMethods` gained exactly the three entries of requirement 6, in order, with names and `deps` intact. Assert the `deps` markers explicitly — `['!']` on the first and `['*']` on the third — since silently losing them would reorder server startup in a way nothing else here would catch.
  - Invoking the first entry's `func({ app })` sets `app.ext._liqOrgs` to an object with an empty `orgSetupMethods` array. **Assert the key name is exactly `_liqOrgs`** — the frozen contract `liq-controls` and `liq-policy` read (D7).
- **Path-var registry has no duplicates.** Across the whole merged plugin, the registered path-var names are `projectName`, `newProjectName`, `orgKey`, `newOrgKey`, `workKey` (as donors land), plus `parameterKey` registered at handler-registration time by `parameters-detail.mjs`. Confirm no name is registered twice — a duplicate throws at startup (C1), so this check is the difference between a green build and a server that will not boot.
- **Tests.** `make test` reproduces the liq-orgs baseline: **+1 suite and +37 tests** relative to the pre-merge dev-core run, from `src/orgs/resources/lib/test/settings.test.mjs`. Confirm the suite count actually rose by one rather than a suite silently going uncollected. There is no live-integration suite in this donor, so **any** failure here is a real regression, not an environment condition.
- **No content drift.** `git diff` between `liq-orgs/<branch>`'s `src/orgs/**` and dev-core's `src/orgs/**` after the merge is empty. Unlike the liq-projects absorb, this donor requires **no** post-move content edit — no `npmName` expectation to fix, no dead comment block to remove. If you find yourself editing a file under `src/orgs/`, stop and justify it in the report.
- **Lint.** `make lint` and `make qa` pass with no new findings. (Expected: the `catalyst`/`sdlc` ESLint configs were measured byte-identical, so liq-orgs's source lints clean under dev-core's config.)
- **Documentation actually says the non-obvious things.** dev-core's docs state: the 5 routes; that an org is a project classified by `liq.packageType === 'org'`; the `_liqOrgs.orgs` / `_liqOrgs.orgSetupMethods` split and who reads/writes each; the three ordered setup methods with their `deps`; `parameterKey`'s handler-registration mechanism; and the known-broken-endpoint disclosure. A reviewer who has never seen liq-orgs should be able to answer "what is an org here?" from dev-core's docs alone.
- **Old-identity sweep.** `grep -rn '@liquid-labs/liq-orgs' src` returns nothing (no source file should name the retired package), and no dev-core doc claims to *be* `@liquid-labs/liq-orgs` — references to it should read as "formerly provided by" / "superseded".

## Metadata

architectural_impact: true

## Assumptions

- **Cross-repository commit mechanics.** The task's own worktree is a `liq-orgs` worktree, but the edits land in the dev-core checkout. Do the work on a dedicated branch in dev-core (e.g. `task/<this-task-slug>`) rather than committing to dev-core's `main`, and report the dev-core branch and commit SHA — merging that branch is a manager/user step. If a git operation there is refused by the environment's agent-scope guard, halt and report the exact command rather than working around it. The precedent is core-server's completed `bun-conversion` task `003`, whose commit landed in the `comply-defaults` repository on its own `task/...` branch.
- `liq-projects` phase 1 (both tasks) and this plan's phase 5 task 001 have landed and merged to their repositories' working branches. This task reads `liq-orgs`'s working branch, not a task branch — confirm the branch name with the manager if it is not `main`.
- Whether `liq-projects` phase 2 has landed is **not** a dependency of this task. The absorptions are independent by construction (D4 — one prefix per donor, no shared content paths). If `src/projects/` is absent, the aggregator wiring in requirement 5 still applies, with `orgs` simply first in the current list and `projects` slotted ahead of it whenever it lands; note the situation in the report so the setup order gets re-verified after the later absorption.
- **No other absorption is running against the dev-core checkout concurrently.** The content cannot conflict, but two agents editing one checkout will.
- The dev-core checkout can `npm install` from the registry for the 4 new dependencies. All four resolve today for liq-orgs, so a resolution failure is an environment problem to report, not a range to "fix".
- `git merge --allow-unrelated-histories` is the sanctioned mechanic per dev-core's contract. Do not substitute a file copy, `git subtree`, or `git filter-repo` — losing history silently is the failure this recipe exists to prevent.
- **The four dead handlers and the `create` stub migrate as-is** (D11). Documenting them is required (requirement 7); fixing them is out of scope and would require changing `getOrgFromKey` in `@liquid-labs/liq-handlers-lib`, outside this plan-group.

## References

- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the absorption recipe (authoritative), root-file ownership, dependency-union rule, plugin contract, setup ordering, retirement policy.
- `plan/notes/liq-orgs-source-inventory.md` — path mapping, the 4 dependencies, the 5-route table, the three path vars, the three setup methods, the measured baseline, corrections C1–C3, and the pre-existing defects.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — decisions D3, D4, D5, D6, D7, D11.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/phase-02-liq-projects-migration/002-absorb-projects-into-dev-core.md` — the first run of this recipe; read its status notes for the observed conflict set and any corrections it made.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/register-handlers.js`, `src/lib/load-plugins.js`, `src/lib/path-var-registry.mjs`, `src/app.js` — the loader, the registration throws behind C1, and the `DependencyRunner` that drains `app.ext.setupMethods`.
- `/Users/zane/playground/liquid-labs/liq-controls/src/lib/resources/load-controls.mjs` and `/Users/zane/playground/liquid-labs/liq-policy/src/liq-policy/setup.mjs` — the live readers/writers of `app.ext._liqOrgs`, for the contract documentation.

## Checkpoint hints

- After the phase-1 and restructured-tree prerequisite checks pass, before adding the remote.
- After the merge is resolved and the file-census / no-donor-root-file checks pass, before touching `package.json`.
- After the dependency union and a successful `npm install` + `make build`.
- After the aggregator wiring, with the route-parity and setup-shape/`app.ext` assertions run and their output recorded.
- After the documentation is authored and the C1 contract check is done, with `make test`/`make lint`/`make qa` green and the observed counts recorded.
