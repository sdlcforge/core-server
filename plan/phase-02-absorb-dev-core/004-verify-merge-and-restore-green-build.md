# Verify Merge And Restore Green Build

## Purpose and scope

The phase gate. Proves that the absorption changed source layout and dependency declarations and **nothing observable**: that every path arrived or was removed exactly as the measured arrival map says, that the donor's history is reachable through all four absorbed components, that the build, test, and lint targets behave as they did before modulo the newly-arrived source, and that the server still registers 165 routes with the same provenance because nothing has been wired yet.

This task fixes only what the merge itself broke. It does **not** fix defects the absorbed source brought with it, does **not** rebaseline `full-tier-*` snapshots (Phase 4 does that, and any movement here is a failure signal rather than something to accept), and does **not** wire anything.

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

### Part 1 — arrival verification by comparison, not recollection

The merge's most-repeated warning is that git's conflict list is not the review list. Compare the post-merge tree against the pre-merge one mechanically. Let `MERGE` be the absorption merge commit from task 001 (`git log --oneline --merges -1 --grep='absorb @sdlcforge/dev-core'` finds it); `$MERGE^1` is `core-server`'s pre-merge side.

```bash
MERGE=$(git log --format=%H --merges --grep='absorb @sdlcforge/dev-core' -1)
PRE=$(git rev-parse "$MERGE^1")

# every path that changed identity across the merge itself
git diff --name-status "$PRE" "$MERGE" | sort > /tmp/merge-delta.txt
wc -l < /tmp/merge-delta.txt            # 161
grep -cv '^A' /tmp/merge-delta.txt      # 0

# the three paths a careless resolution could clobber
for p in src/lib/index.js bun.lock .catalyst-data.yaml; do
  a=$(git rev-parse "$PRE:$p"); b=$(git rev-parse "$MERGE:$p")
  [ "$a" = "$b" ] && echo "UNTOUCHED $p ($a)" || echo "CLOBBERED $p $a -> $b"
done

# plan/ came through with core-server's own 14 paths and no net change
git diff --name-status "$PRE" "$MERGE" -- plan     # prints nothing
git ls-tree -r --name-only "$MERGE" -- plan | wc -l # 14

# the 13 conflicts were resolved to core-server's exact pre-merge blobs
for p in .gitignore Makefile README.md docs/architecture.md \
         make/10-locations.mk make/10-resources.mk make/15-data-finder.mk \
         make/20-js-src-finder.mk make/55-lint.mk make/55-test.mk \
         make/95-final-targets.mk package.json plan/followups.yaml; do
  a=$(git rev-parse "$PRE:$p"); b=$(git rev-parse "$MERGE:$p")
  [ "$a" = "$b" ] && echo "OURS  $p" || echo "DRIFT $p"
done

# the eight-path removal set is absent from the current tree
git ls-files -- .sdlc-data.yaml make/50-dev-core-js.mk package-lock.json \
  plan/plan-summary-dev-core-plugin-manifest.md plan/plan-summary-orgs-defects-remediation.md \
  src/index.mjs src/test    # prints nothing

# the two deliberate keeps are present
git ls-files -- docs/consumer-migration.md docs/dev-core-consolidation-contract.md  # both listed

# no conflict marker survived anywhere
grep -rn --include='*.md' --include='*.mjs' --include='*.js' --include='*.json' \
     --include='*.mk' --include='Makefile' -E '^(<{7}|={7}|>{7})( |$)' . \
     | grep -v '^./node_modules/' | grep -v '^./test-staging/'   # prints nothing
```

Cross-check the root-level rows against `plan/resources/pre-merge-root-blob-map.md`, Phase 1's recorded map, which pins the commit it was taken at. Where the map and the `$PRE` comparison disagree, `$PRE` governs (it is the actual merge base) and the map is describing a different starting commit — say so in the report rather than picking one silently.

### Part 2 — history preservation across all four components

Task 001 sampled one file per component. Do it again from the landed history, two files per component, and confirm each chain reaches a commit that predates the merge on the donor's side:

```bash
for f in src/projects/handlers/_lib/create-lib.mjs src/projects/handlers/_lib/rename-lib.mjs \
         src/orgs/setup.mjs src/orgs/handlers/create.mjs \
         src/work/handlers/resume.mjs src/work/handlers/_lib/work-db.mjs \
         src/projects-audit/handlers/_lib/audit-lib.mjs \
         src/projects-audit/handlers/_lib/audit-fix-lib.mjs; do
  n=$(git log --follow --format=%H -- "$f" | wc -l | tr -d ' ')
  oldest=$(git log --follow --format=%H -- "$f" | tail -1)
  if git merge-base --is-ancestor "$oldest" dev-core-source/main; then
    echo "OK   $f — $n commits, oldest $oldest"
  else
    echo "FAIL $f"
  fi
done
```

If `dev-core-source` was removed as a remote, re-add it (`git remote add dev-core-source /Users/zane/playground/sdlcforge/dev-core && git fetch dev-core-source main`) rather than skipping the check.

### Part 3 — the build/test/lint gate, with 20 newly-executing suites

Provision first (a fresh worktree has neither `node_modules` nor `.yalc/`):

```bash
scripts/provision-local-deps.sh
make build && make test ; make lint
```

**Test-count arithmetic.** `core-server` ran 17 suites before the merge. Twenty absorbed `*.test.mjs` / `*.test.js` suites now transpile into `test-staging/` and are collected by Jest's default `testMatch` — the merge brought 22, of which task 001 removed the two package-level ones (`src/test/index.test.mjs`, `src/test/plugin-manifest.test.mjs`). Expect **37** collected suites. A number materially below 37 means Babel is not emitting the absorbed trees; a number above means a package-level suite survived the removal.

**One inherited failure is expected.** `src/projects/handlers/_lib/test/project-lifecycle.test.mjs` fails independently of the merge: its `appMock` supplies `app.ext.serverHome` while `src/projects/handlers/_lib/create-lib.mjs` reads `app.ext.serverConfigRoot`. This is a pre-existing donor defect carried verbatim under the no-behavior-change rule (task 002 re-files it as a `core-server` followup). **Do not fix it in this phase** — fixing absorbed source here breaks the "the merge changed nothing observable" property this task exists to prove. Record it as an inherited failure and move on.

Also note `src/projects/handlers/test/close-implied.mjs` — a misnamed file missing the `.test` infix that Jest never collects. Dead in both directions; leave it.

**Every other failure is in scope to diagnose.** For each one, determine whether it is (a) a defect in the absorbed source that also fails in dev-core's own tree, (b) an artifact of `core-server`'s toolchain differing from dev-core's, or (c) genuinely merge-induced. Only (c) is this task's to fix. For (a), re-file as a followup and record it. For (b), the most likely instance is already identified and must be checked explicitly:

- **The Babel `--ignore` divergence.** dev-core's `make/55-test.mk` passed `--ignore='**/test/data/**' --ignore='**/test-data/**'` to Babel; `core-server`'s does not, and task 001 resolved that file `--ours`. dev-core brings test-data fixture trees (`src/projects/handlers/_lib/test/data/`, `src/work/handlers/_lib/test/data/`, and others). Their contents are `.txt` / `.json` / `.yaml` / `.plain`, which Babel does not compile by default, so `--ours` is very likely safe — but verify rather than assume:

  ```bash
  find src -path '*/test/data/*' -o -path '*/test-data/*' | sed 's/.*\.//' | sort -u
  find test-staging -path '*/test/data/*' -o -path '*/test-data/*' | head -20
  ```

  Confirm every fixture the absorbed suites read is present under `test-staging/` in readable form. If a fixture is mangled or missing, the fix is to add the two `--ignore` flags to `core-server`'s `make/55-test.mk` — a build-config change, in scope for this task, to be called out prominently in the report.

**Lint.** `core-server` carries a standing ~233-finding ESLint baseline (followups `b3hk`, `mLm3`). Record the pre-merge finding count (from `plan/resources/dev-core-absorption-pre-merge-baseline.md`) and the post-merge count, and state the delta and where it comes from. Do **not** reformat or restyle absorbed source to close the gap: no behavior change, and Phase 5 owns the component-boundary lint work. If `make lint` exits non-zero and did so before the merge too, that is the standing baseline, not a regression — say so explicitly with both numbers rather than reporting "lint fails".

### Part 4 — prove the absorbed code is inert

At phase end the absorbed source is in tree but wired to nothing. That is verifiable, not assumed:

```bash
grep -n 'submodules' src/lib/builtin-plugins.mjs        # still 3 entries; no projects/orgs/work/projects-audit
grep -n 'dev-core' src/lib/app-init.mjs                  # @sdlcforge/dev-core still in explicitPlugins
jq -r '.plugable.host.explicitPlugins[]' package.json    # 5 entries, incl. @sdlcforge/dev-core
jq -r '.plugable.host.builtins[0].components[].component' package.json  # still 3
grep -n 'file:' package.json                             # exactly 2 lines
git status --porcelain test/__snapshots__/               # empty
```

Snapshots must be **unmoved**. `full-tier-api-spec.json` still holds 165 routes with the same `npmName` tally (35 `plugable-express` / 112 `@sdlcforge/dev-core` / 6 `@sdlcforge/core-server` / 6 + 2 + 2 + 2 `sdlc-projects-*`); `full-tier-plugins-list.json` still holds 6 entries; `golden-api-spec.json` and `golden-plugins-list.json` are byte-identical. If any snapshot moves, something was wired and this task must find out what — **never** run `bun run test:update-full-tier-baseline` in this phase.

## Validation

1. Part 1's comparison block runs clean: 161 changed paths, all `A`; `src/lib/index.js`, `bun.lock`, and `.catalyst-data.yaml` untouched across the merge commit; zero `plan/` delta with 14 tracked `plan/` paths; all 13 conflict paths equal to their pre-merge blobs; the eight removed paths absent; the two kept `docs/` files present; no conflict markers anywhere outside `node_modules/` and `test-staging/`.
2. Part 2 reports `OK` for all eight sampled files, each with more than one commit in its `--follow` chain and its oldest commit reachable from `dev-core-source/main`.
3. `make build` exits 0 and produces `dist/sdlcforge-server.js`, `dist/sdlcforge-server-exec.js`, and both `.js.map` files. `dist/dev-core.js` is **not** produced (`make/50-dev-core-js.mk` was removed).
4. `make test` collects **37** suites. The only failing suite is `project-lifecycle.test.mjs`, recorded as inherited. Any other failure is diagnosed in the report with its (a)/(b)/(c) classification, and every (c) is fixed.
5. The Babel fixture check ran and its outcome is recorded: either the fixtures are intact under `test-staging/` and `make/55-test.mk` is left `--ours`, or the two `--ignore` flags were added with the evidence that made them necessary.
6. `make lint`'s pre-merge and post-merge finding counts are both stated, with the delta attributed to the absorbed source. No absorbed source file was restyled or reformatted (`git diff $MERGE -- 'src/projects/*' 'src/orgs/*' 'src/work/*' 'src/projects-audit/*'` shows no style-only changes from this task).
7. Part 4's inertness checks all pass: three submodules in `builtin-plugins.mjs`, three components in the host declaration, five `explicitPlugins` including `@sdlcforge/dev-core`, exactly two `file:` lines in `package.json`.
8. `git status --porcelain test/__snapshots__/` is empty and `git diff $PRE -- test/__snapshots__/` is empty: `full-tier-api-spec.json` (165 routes, unchanged tally), `full-tier-plugins-list.json` (6 entries), `full-tier-integrations-list.json`, `golden-api-spec.json`, and `golden-plugins-list.json` all byte-identical to their pre-merge blobs.
9. Every phase output in [`phases/absorb-dev-core.md`](../phases/absorb-dev-core.md) is checked off in the report, each with the evidence that satisfies it — including the four carried-forward conflict decisions (recorded in the merge commit message), the followups re-filing (task 002's IDs), and `plan/resources/dev-core-absorption-dependency-union.md`'s existence.
10. `git status --porcelain` is empty at task end.

## Checkpoint hints

- After Part 1's arrival verification, before provisioning dependencies.
- After Part 2's history verification.
- After `make build` succeeds, before the test run.
- After the test-and-lint characterization, if any `make/55-test.mk` change was needed.

## Assumptions

- Tasks 001, 002, and 003 have all landed on `main`, and this task's branch is cut from that `main`. `package.json` carries the 33-entry dependency block and `bun.lock` has been refreshed.
- `make test` is expected to be red by exactly one suite. "Green" for this phase means *no failure beyond the enumerated inherited ones*, not a literally zero-failure run. If Phase 1's recorded baseline shows `core-server` had failing suites of its own before the merge, those are inherited too — name them.
- `make lint` is expected to exit non-zero against `core-server`'s standing ~233-finding baseline both before and after the merge. The gate is the delta and its attribution, not the exit code.
- The absorbed source is expected to produce new ESLint findings. Recording them is in scope; fixing them is not — no behavior change in this phase, and Phase 5 owns the boundary rule.
- If the failure count or the collected-suite count is materially different from the numbers above, halt and report rather than adjusting the numbers to match. The counts came from a measured inventory and a divergence is information.

## Status

**Outcome:** succeeded. Date: 2026-09-06. Implemented on branch `plan/sdlc-core-unification-02-004`, worktree `worktrees/plan/sdlc-core-unification-02-004` (cut from `main`, post tasks 001-003), as commit `c158ba7`. All Part 1-4 checks and all ten `## Validation` items passed, after one in-scope (category-c) fix: `src/projects/handlers/test/lib/test-calls-implied.mjs`'s shared package-identity literal updated from `'@sdlcforge/dev-core'` to `'@sdlcforge/core-server'` (6 dependent test suites). `make build` green; `make test` collected 38 suites (corrected from the doc's stale "37" — actual pre-merge suite count was 18, not 17; see flagged followups), only the documented inherited failure (`project-lifecycle.test.mjs`) red; `make lint` pre/post-merge counts identical at 236 (absorbed source contributed zero new findings, directly verified). Snapshots and route/plugin tallies confirmed byte-identical; Part 4 inertness checks all passed. Four items flagged to the manager and recorded as followups (suite-count staleness, blob-map pin-point drift — expected, ESLint-zero-findings note, and the merge-commit-message's stale "17" figure).

Note: this Status section itself was applied by the manager, not the dispatched task agent — the agent's own worktree was cut from `main` before this plan's phase-02 task documents existed on that lineage, so it could not write here from inside its own worktree boundary.

## References

- [`phases/absorb-dev-core.md`](../phases/absorb-dev-core.md) — goal 7 and the full Outputs list this task checks off.
- [`notes/merge-arrival-inventory.md`](../notes/merge-arrival-inventory.md) — the arrival counts, the untouched-blob trio, the 20-newly-executing-suites arithmetic, and the Babel `--ignore` observation under "Adjacent observations".
- [`notes/pre-merge-state.md`](../notes/pre-merge-state.md) — the pre-merge route/plugin surface (165 routes, 6 plugins-list entries) this task confirms is unmoved.
- `plan/resources/dev-core-absorption-parity-contract.md` — Phase 1's contract. Phase 2 is the "nothing on this list has happened yet" end of it: every observable it lists as expected-to-change must still be at its pre-merge value here.
- `plan/resources/dev-core-absorption-pre-merge-baseline.md` — Phase 1's recorded observables (setup-method `{name, deps}` pairs, the `app.ext` key set, the registered path-variable set, the full `validatePluginSet()` finding set, and the lint/test baselines) that this task compares against.
- `plan/resources/pre-merge-root-blob-map.md` — Phase 1's recorded root-level blob map, with the commit it was pinned at.
- `AGENTS.md` / `CLAUDE.md` — the build, test, and lint commands and the three test levels.
