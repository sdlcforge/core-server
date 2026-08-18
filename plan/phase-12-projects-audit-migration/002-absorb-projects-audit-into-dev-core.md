# Absorb Projects-Audit Into Dev-Core

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`), not in `plugable-projects-audit`.

Bring the restructured `plugable-projects-audit` tree into `@sdlcforge/dev-core` as the `src/projects-audit/` submodule, with its git history preserved, **exactly one** new runtime dependency added, the four handlers spread into the aggregator's array with **no** setup entry, dev-core's build/test/lint at no worse than its pre-merge state, and the four audit routes present with byte-identical `path` arrays — and with the audit route surface documented for the first time.

This is the **fourth and last** run of the absorption recipe. Read `docs/dev-core-consolidation-contract.md` first, and read the status notes of the `liq-projects`, `liq-orgs`, and `liq-work` absorb tasks — three runs of this recipe have already happened and any of them may have corrected it. Where this document is more specific (the file list, the dependency handling, the parity numbers, the `src/index.mjs` special case), this document governs.

**This donor's absorption is the smallest in the plan-group — nine relocated files, four handlers, one dependency, no `setup` — and it contains the single most dangerous step in it.** Requirement 4 is that step. Read it before you start.

## Requirements

1. **Verify the prerequisites before touching anything.** Halt rather than improvise if either is missing.
   - **`liq-projects` phase 1 has landed in dev-core**: `docs/dev-core-consolidation-contract.md`, `package.json` with authored metadata and a non-empty `description`, `Makefile`, `make/*.mk` including `make/50-dev-core-js.mk`, `.sdlc-data.yaml`, `.gitignore`, `README.md`, and `src/index.mjs` with its aggregator and ordered-setup shape all exist. **This task does not scaffold any of that.**
   - **`plugable-projects-audit` phase 12 task 001 has landed on the branch you will merge.** Confirm with `git ls-tree -r --name-only projects-audit/<branch> -- src` **before** merging: it must show `src/projects-audit/…` and `src/index.mjs`, and must **not** show `src/handlers/…`. If it still shows the pre-restructure layout, halt — merging a pre-restructure tree writes files at the wrong paths and is painful to undo.
   - Also confirm phase 11 landed on that branch: `git show projects-audit/<branch>:package.json | grep http-smart-response` must show `^1.0.0-alpha.6`, **not** a `file:` spec. If it shows a `file:` spec, halt: requirement 5's premise is broken and you would be at risk of unioning an unpublishable dependency into dev-core.

2. **Record dev-core's pre-merge state**, so every "unchanged" and "plus four" claim below is measurable rather than asserted:
   - `git ls-files src | wc -l`, and the full listing.
   - `cat src/index.mjs` — verbatim. **Keep this.** Requirement 4's post-condition compares against it.
   - The submodules currently wired into the aggregator, and the composite setup's ordered list.
   - `make build && make test && make lint`, with suite/test counts and the **exact set of failing suites**. Per **C15** this donor is green on Node v26.5.0, but dev-core inherits `liq-projects`'s Node-26 `SlowBuffer` failures from phase 2, so **the gate in dev-core is "no *new* failures beyond the pre-merge set"**, not "green". Write the pre-merge failing set down; you cannot apply that rule without it.
   - `node -e "const m=require('./dist/dev-core.js'); console.log(m.handlers.length, typeof m.setup)"` → the pre-merge handler count.

3. **Establish the merge.** From the dev-core task worktree:
   - `git remote add projects-audit /Users/zane/playground/liquid-labs/plugable-projects-audit` (a local path remote; no network) and `git fetch projects-audit`.
   - `git merge --allow-unrelated-histories --no-commit projects-audit/<branch>`, then resolve deliberately. **Use `--no-commit` and resolve explicitly here even if an earlier run used `-X ours`** — requirement 4 is a conflict whose resolution you must see with your own eyes.

4. **Resolve `src/index.mjs` in dev-core's favor. This is the step that can silently destroy the package.** *(correction **C17**)*

   Every other donor's root entry point is `src/index.js`, so their absorb tasks list it as a **clean arrival to `git rm`**, and D3's drop list says "the donor's root `src/index.*`". **This donor's root entry is `src/index.mjs` — the exact path dev-core's aggregator occupies.** It therefore arrives as a **conflict**, and:

   - Resolve it to **dev-core's** version: `git checkout --ours -- src/index.mjs && git add src/index.mjs`.
   - **Never `git rm src/index.mjs`.** Never take `--theirs`. Never "resolve" it by keeping the donor's one-line `export * from './projects-audit'`.

   **Why this is worth its own requirement:** taking the donor's side replaces dev-core's merged-handler aggregator with a one-line re-export. Rollup still builds. `make build` is still green. `dist/dev-core.js` still exports a perfectly valid 4-element `handlers` array. What is gone, with no error anywhere, is every other donor's handlers *and* the entire composite `setup` — which means the merged plugin silently stops registering GitHub credentials, stops creating the playground directory, stops publishing `app.ext._liqProjects` and `app.ext._liqOrgs`, and stops registering every path var. The failure would surface later, in a different repository, as a startup crash with no obvious cause.

   **Hard post-condition, to be run and its output recorded before you go any further:** `git diff <pre-merge-commit> -- src/index.mjs` is **empty at this point in the task** — byte-for-byte dev-core's pre-merge aggregator, before requirement 6 edits it. If it is not empty, stop and redo the resolution.

5. **Resolve the remaining root-level paths in dev-core's favor, and drop the donor package-level files** (D3). dev-core's version of every root path wins byte-for-byte.

   Expected conflicts (12): `package.json` (resolve to dev-core's, *then* apply requirement 6), `package-lock.json`, `.gitignore`, `.sdlc-data.yaml`, `Makefile`, `make/10-locations.mk`, `make/10-resources.mk`, `make/15-data-finder.mk`, `make/20-js-src-finder.mk`, `make/55-lint.mk`, `make/55-test.mk`, `make/95-final-targets.mk` — plus `src/index.mjs` from requirement 4, and `README.md` if dev-core has authored one by now.

   Expected **clean arrivals that must be removed with `git rm`** (2): `make/50-plugable-projects-audit-js.mk`, and **`plan/manifest.yaml`** — the Flow plan artifact of the `liq-work` slice's **C4**. `git rm` anything else that arrives under `plan/`.

   Two notes specific to this donor, both meaning *less* work: it has **no `.catalyst-data.yaml`** and **no `docs/`**, so neither appears. And its seven shared `make/*.mk` files plus its `Makefile` were measured **byte-identical** to `liq-projects`'s, so those conflicts (if git raises them at all) resolve to identical content either way.

   Verify the actual conflict/arrival set against this list and **report any difference; do not silently accept an unexpected file.**

6. **Union the dependencies — and this is where a `file:` spec must not get through** *(correction **C13**)*. The donor declares four runtime dependencies. Only **one** of them results in an edit to dev-core's `package.json`:

   | dependency | donor's range | expected in dev-core already | action |
   |---|---|---|---|
   | `npm-check-plus` | `^1.0.0-alpha.5` | — | **add** |
   | `@liquid-labs/npm-toolkit` | `^1.0.0-alpha.17` | `^1.0.0-alpha.21` (from `liq-projects`/`liq-work`) | **none** — higher already present (D4 step 3) |
   | `http-errors` | `^2.0.0` | `^2.0.0` (from `liq-projects`) | **none** — identical |
   | `@liquid-labs/http-smart-response` | `^1.0.0-alpha.6` after phase 11 | `^1.0.0-alpha.6` (from `liq-projects`) | **none** — identical |

   Then `npm install` to refresh `package-lock.json`.

   **Do not lower `@liquid-labs/npm-toolkit` to `^1.0.0-alpha.17`.** D4's rule is "on an overlap, take the higher range"; the higher one is already there. Record the choice in the report per D4.

   **And, regardless of what the donor's `package.json` says on the branch you merged: never write a `file:` spec into dev-core's `package.json`.** D4 step 3 was written for range-versus-range overlaps and has no rule for this; a `file:` spec has no ordering to compare and does not survive publication — it would make `@sdlcforge/dev-core` uninstallable for anyone but the developer who created the `.yalc/` directory. If phase 11 did not land and you are looking at `file:.yalc/@liquid-labs/http-smart-response`, **halt** (requirement 1) rather than "resolving" it here.

   Verify afterwards that dev-core's `package.json` contains **no** `file:` spec at all: `grep -n 'file:' package.json` returns nothing.

7. **Wire the aggregator — handlers only, no setup entry.** In `src/index.mjs`: import `./projects-audit` and spread its `handlers` into the exported array.

   **Add nothing to the composite setup list.** This donor has no `setup`, verified by measurement (`typeof setup === 'undefined'` on its built bundle), and D6 item 4 states it. Do not add a placeholder, a no-op, or a conditional. The composite setup's ordered list and its `projects` → `orgs` → `work` ordering are untouched by this absorption.

   Build a **fresh** merged array (`[...projectsHandlers, …, ...projectsAuditHandlers]`) per **D5**. This donor's `src/projects-audit/handlers/index.mjs` already builds a plain literal array with no `push` side-effects, so it composes cleanly; do not introduce one.

8. **Document the subsystem — this is authoring, not porting.** Like `liq-orgs`, this donor has no README, no `docs/`, and an empty `description`; its four endpoints have never been described anywhere except in `sdlcforge/core-cli`'s generated reference. Add to dev-core's `README.md` and/or `docs/` (follow whatever structure phase 1 and the earlier absorbs established):

   - **The 4-route table** with methods and exact paths, in the same form as the other submodules':

     | method | path |
     |---|---|
     | `get` | `projects/:projectName/audit` |
     | `get` | `projects/audit` |
     | `put` | `projects/:projectName/audit-fix` |
     | `put` | `projects/audit-fix` |

   - **What "audit" means here**, because the name is misleading in a repository that also contains policy/compliance tooling: it is `npm audit` plus outdated/missing/extraneous dependency analysis via `npm-check-plus`. It is **not** a compliance or policy check, and it is unrelated to `liq-controls`.
   - **The explicit/implied pairing**: the *implied* variants resolve the project from the `X-CWD` request header via `getPackageJSON`, and return `400` when that header is absent; the *named* variants take `:projectName` from the path.
   - **This submodule contributes no `setup`** — it is the only one of the four that does not — but it does read `app.ext._liqProjects.playgroundMonitor.getProjectData(projectName)` at request time, and two of its four paths use the `projectName` path var that only the `projects` submodule's `setup` registers. **State that dependency explicitly** (see **C14**); it is invisible from this submodule's own code and is the reason these endpoints cannot be split out of dev-core later without carrying the contract with them.
   - **The inherited defects, disclosed rather than buried** (source inventory **A8**): the two *implied* endpoints declare a `projectName` parameter they cannot use; `audit-fix-lib.mjs`'s `removePackages` parameter uses the key `dascription`, so its help text is dropped from the API spec; an unknown project name yields a 500 rather than a 404 because `getProjectData` returns `undefined` and is immediately destructured; and four prose typos (`Auidts`, `reomved`, `pacagkes`, `specificatinos`) are published in user-facing help. Migrating them unchanged is the deliberate D11-compliant choice; shipping them silently undocumented is not. Link the follow-up.

9. **Make no content edit inside `src/projects-audit/`.** Unlike the `liq-projects` absorb, this donor requires **no** post-move content change — there is no `npmName` expectation to fix (nothing in this donor's source names its own package; `grep -rn '@liquid-labs/plugable-projects-audit' src/projects-audit` returns nothing) and no dead comment block to remove. If you find yourself editing a file under `src/projects-audit/`, stop and justify it in the report.

10. **Verify and record the numbers.** `npm install`, `make build`, `make test`, `make lint`, `make qa` — with the observed suite/test counts and failing-suite set written into this task document's status notes alongside the pre-merge baseline from requirement 2.

## Validation

- **The C17 gate — run this first, and run it again at the end.** After the full merge and all edits:
  - `src/index.mjs` still imports **every** submodule that was wired before this task, plus `./projects-audit`. Compare against the verbatim copy captured in requirement 2.
  - `git diff <pre-merge-commit> -- src/index.mjs` shows **only additions** relating to `projects-audit` — no deleted import, no deleted spread, no deleted setup entry.
  - `node -e "const m=require('./dist/dev-core.js'); console.log(m.handlers.length, typeof m.setup)"` prints the pre-merge handler count **plus exactly 4**, and `function`. **A `typeof setup` of `undefined` means C17 fired and the aggregator was replaced — halt and redo the merge.**
- **History preserved.** `git log --follow -- src/projects-audit/handlers/_lib/audit-lib.mjs` reaches commits authored in `plugable-projects-audit` before this plan — `7d797ba` ("specified missing pash parameter; updated tests") and `d553791` ("audit fix updates") are good anchors. Run the same check for `src/projects-audit/handlers/audit.mjs`. A `--follow` that stops at the merge means the absorption lost history and must be redone.
- **File census.** `git ls-files src/projects-audit | wc -l` equals **10**, and matches, exactly, the listing phase 12 task 001 recorded, minus the root `src/index.mjs`. Compare against task 001's recorded listing, not against this number alone. `git ls-files 'src/handlers/*'` returns nothing.
- **No donor package-level file survived.** All of these return nothing: `git ls-files | grep 'make/50-plugable-projects-audit-js.mk'`, `git ls-files | grep '^plan/'`. `git ls-files Makefile make .sdlc-data.yaml .gitignore README.md package.json` shows exactly dev-core's own set. There is no `.catalyst-data.yaml` to check for in this donor.
- **Package identity intact.** `package.json` `name` is `@sdlcforge/dev-core`, `version` unchanged from before this task, `main` is `dist/dev-core.js`, `description` is dev-core's authored one. `git diff` on those lines relative to the pre-merge state is empty.
- **Dependency union is exactly one addition, and no `file:` spec.**
  - `git diff <pre-merge-commit> -- package.json` shows **exactly one added dependency line**, `"npm-check-plus": "^1.0.0-alpha.5"`.
  - `grep -n 'file:' package.json` returns nothing.
  - `grep -n 'npm-toolkit' package.json` shows exactly one entry, at `^1.0.0-alpha.21`.
  - `grep -n 'http-smart-response' package.json` shows exactly one entry, at `^1.0.0-alpha.6`.
  - `npm ls --depth=0` resolves with no missing/unmet dependency errors; `package-lock.json` is committed and consistent (`npm ci --dry-run` or equivalent succeeds); `grep -c '\.yalc' package-lock.json` is 0.
- **Build.** `make build` produces `dist/dev-core.js`.
- **Route parity — exactly 4 new routes, byte-identical.** Read the route list off the **built bundle** (this method needs no path-var registry and therefore works whether or not `src/projects/` has landed — see C14), write it to a file, and `diff` mechanically against the `/tmp/ppa-routes-post-move.json` phase 12 task 001 produced:

  ```bash
  node -e "const m=require('./dist/dev-core.js');
    const a=m.handlers.filter(h=>h.path&&h.path[0]==='projects'&&/^audit/.test(h.path[h.path.length-1]));
    console.log(JSON.stringify(a.map(h=>({m:h.method,p:h.path,n:h.help.name,pa:h.parameters})),null,1))"
  ```

  Expect exactly these four `path` arrays, with these methods:
  - `['projects', ':projectName', 'audit-fix']` (PUT)
  - `['projects', 'audit-fix']` (PUT)
  - `['projects', ':projectName', 'audit']` (GET)
  - `['projects', 'audit']` (GET)

  **This check, not `make test`, is the real gate** — this donor's suite is a single placeholder assertion over one pure function and cannot detect a handler regression.
- **No route collision with the `projects` submodule.** If `src/projects/` has landed, confirm that the merged `path` set contains no duplicate: `audit`/`audit-fix` do not appear among `liq-projects`'s 19 paths (verified at plan-authoring time), so a duplicate here means something was double-registered by the aggregator. A duplicate would throw `Non-unique command path: …` at server startup (C1), so this is the difference between a green build and a server that will not boot.
- **Optional, and only if `src/projects/` has landed (C14):** register the merged plugin against a stub app and confirm the four paths process without throwing. If `src/projects/` has **not** landed, this check is **unavailable** — `pathToRe` throws `Unknown variable path element type 'projectName' while processing path projects/:projectName/audit.` because only the `projects` submodule's `setup` registers that var. That is expected, is not a regression, and must be reported as "deferred to phase 13 task 001" rather than worked around.
- **Composite setup untouched.** The ordered setup list is the same list, in the same order, as the pre-merge copy from requirement 2 — no entry added, none reordered. `grep -n 'projects-audit' src/index.mjs` shows the import and the handler spread and **nothing in the setup list**.
- **Tests.** `make test` shows the pre-merge suite/test counts **plus exactly 1 suite and 1 test** (`src/projects-audit/handlers/_lib/audit-lib.test.mjs`), and **no new failing suite** beyond the pre-merge set recorded in requirement 2. Confirm the suite count actually rose by one rather than a suite silently going uncollected.
- **No content drift.** `git diff projects-audit/<branch> -- src/projects-audit` after the merge is empty. Per requirement 9 this donor needs no post-move edit; a non-empty diff means one was made.
- **Lint.** `make lint` and `make qa` pass with no new findings. Expected: this donor's ESLint configuration is the same `@liquid-labs/sdlc-resource-eslint ^1.0.0-alpha.2` dev-core uses, so its source lints clean unchanged.
- **Documentation actually says the non-obvious things.** dev-core's docs state: the 4 routes; that "audit" means npm dependency auditing and **not** policy/compliance; the `X-CWD` mechanism and the 400 behind the implied variants; that this submodule has **no `setup`** yet depends on the `projects` submodule's `setup` for the `projectName` path var; and the four inherited defects. A reviewer who has never seen this package should be able to answer "what does `/projects/audit` do, and what breaks if the `projects` submodule is removed?" from dev-core's docs alone.
- **Old-identity sweep.** `grep -rn '@liquid-labs/plugable-projects-audit' src` returns nothing, and no dev-core doc claims to *be* `@liquid-labs/plugable-projects-audit` — references should read as "formerly provided by" / "superseded".

## Metadata

architectural_impact: true

## Assumptions

- **Cross-repository commit mechanics.** The task's own worktree is a `plugable-projects-audit` worktree, but the edits land in the dev-core checkout. Do the work on a dedicated branch in dev-core (e.g. `task/<this-task-slug>`) rather than committing to dev-core's `main`, and report the dev-core branch and commit SHA — merging that branch is a manager/user step. If a git operation there is refused by the environment's agent-scope guard, halt and report the exact command rather than working around it. The precedent is core-server's completed `bun-conversion` task `003`, whose commit landed in the `comply-defaults` repository on its own `task/…` branch.
- `liq-projects` phase 1 (both tasks) and this plan's phase 11 and phase 12 task 001 have landed and merged to their repositories' working branches. This task reads `plugable-projects-audit`'s working branch, not a task branch — confirm the branch name with the manager if it is not `main`.
- **Whether any *other* donor's absorption has landed is not a dependency of this task.** The absorptions are content-independent by construction (D4 — one prefix per donor, no shared content paths). If `src/projects/`, `src/orgs/`, or `src/work/` are absent, the aggregator wiring in requirement 7 still applies; note the situation in the report, and note that the optional registration check under Validation is unavailable until `src/projects/` lands (**C14**).
- **No other absorption is running against the dev-core checkout concurrently.** The content cannot conflict, but two agents editing one checkout will.
- The dev-core checkout can `npm install` from the registry for `npm-check-plus ^1.0.0-alpha.5`. It resolves today for this donor, so a resolution failure is an environment problem to report, not a range to "fix".
- `git merge --allow-unrelated-histories` is the sanctioned mechanic per dev-core's contract. Do not substitute a file copy, `git subtree`, or `git filter-repo` — losing history silently is the failure this recipe exists to prevent.
- **dev-core is not expected to be green.** It inherits `liq-projects`'s Node-26 `SlowBuffer` test failures from phase 2. The rule is "no new failures beyond the pre-merge set" (**C15** explains why this donor's own repository uses the stricter "green" rule and dev-core cannot).
- **The four inherited defects migrate as-is** (D11). Documenting them is required (requirement 8); fixing them would change the generated API spec and is out of scope.

## References

- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the absorption recipe (authoritative), root-file ownership, dependency-union rule, plugin contract, setup ordering.
- `plan/notes/plugable-projects-audit-source-inventory.md` — **A4** the path mapping, **A2** the dependency table, **A1** the route table and the collision check against `liq-projects`'s 19 paths, **A5**/**C17** the `src/index.mjs` collision in full, **A8** the inherited defects, **A9** the baseline, **C13**, **C14**, **C15**, **C16**.
- `plan/phase-12-projects-audit-migration/001-restructure-src-into-dev-core-layout.md` — the post-restructure file census and the route-list JSON this task diffs against.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/phase-02-liq-projects-migration/002-absorb-projects-into-dev-core.md`, `.../liq-orgs/.../phase-05-liq-orgs-migration/002-absorb-orgs-into-dev-core.md`, `.../liq-work/.../phase-08-liq-work-migration/002-absorb-work-into-dev-core.md` — the first three runs of this recipe. **Read their status notes for the observed conflict sets and any corrections they made** before running the fourth.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/path-to-re.mjs` (lines 14–19) — the `Unknown variable path element type` throw behind C14; `src/lib/register-handlers.js` (lines 130–132) and `src/lib/path-var-registry.mjs` (lines 28–34) — the duplicate-registration throws behind C1.

## Checkpoint hints

- After the phase-1 / restructured-tree / no-`file:`-spec prerequisite checks pass and the pre-merge baseline is recorded, before adding the remote.
- **Immediately after resolving `src/index.mjs`**, with requirement 4's hard post-condition run and its output recorded. Do not proceed past this point on an unverified resolution.
- After the remaining conflicts are resolved, the two clean arrivals are `git rm`'d, and the file-census check passes, before touching `package.json`.
- After the single dependency addition and a successful `npm install` + `make build`, with the no-`file:`-spec check run.
- After the aggregator wiring, with the C17 gate and the route-parity diff run and their output recorded.
- After the documentation is authored, with `make test`/`make lint`/`make qa` run and the observed counts and failing-suite set recorded.
