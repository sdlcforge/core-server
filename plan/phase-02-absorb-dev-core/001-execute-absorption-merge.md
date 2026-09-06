# Execute Absorption Merge

## Purpose and scope

Perform the git-history-preserving merge of `@sdlcforge/dev-core`'s `main` into `@sdlcforge/core-server`, resolve all **14** `add/add` conflicts in `core-server`'s favor, remove the **8** arriving paths that have no `core-server` counterpart, and land the result as a single merge commit whose history reaches the donor's original commits.

**Correction (2026-09-06, applied after a real dispatch measured the live donor tip):** the donor's `main` advanced one commit past this document's originally-measured tip `5d5c2a3` to **`914f951`** ("plan(sdlc-core-unification): patch manifest entry"), whose sole change adds a `dependencies` block to dev-core's own `plan/manifest.yaml` entry for the `sdlc-core-unification` plan-group (recording that dev-core's own retirement task must not run until core-server's Phase 4 verification lands — a scheduling note for dev-core's own execution, tracked independently in dev-core's own live repository and plan/manifest.yaml, both entirely untouched by this merge). This turns `plan/manifest.yaml` from a silent identical merge into a **14th `add/add` conflict**. It carries no substance `core-server` needs to preserve — see the updated conflict table and Step 4 below — and every other measured count in this document (the 162-path donor shape, the 169 clean arrivals, the 8-path removal set, the untouched trio) is confirmed unaffected and unchanged.

Scope is the git operation and nothing else. This task does **not** wire anything (`src/lib/builtin-plugins.mjs` and `explicitPlugins` are untouched — that is Phase 3), does **not** change `package.json`'s `dependencies` (task 003), does **not** re-file dev-core's followups (task 002), and does **not** own the build/test/lint gate (task 004). After this task the absorbed source sits in tree and is completely inert.

There is no standard skill for this. Follow the [Procedure](#procedure) literally — every command below was derived from a real trial merge recorded in [`notes/merge-arrival-inventory.md`](../notes/merge-arrival-inventory.md) and re-verified against both live checkouts. Do not re-derive the conflict list, the removal list, or the arrival counts from scratch; verify the measured ones and halt if they disagree.

## Requirements

`role_doc: plugins/flow/roles/developer.md`

### The merge target branch

The merge lands on this task's own worktree branch, which **must be cut from `core-server`'s `main`** — a unit-of-work branch in the phase document's terms. It must **not** land on `plan/sdlc-core-unification`: that branch's `plan/` tree is this plan's own working state (23 paths), and merging the donor into it corrupts the plan worktree. Confirm this before doing anything else (step 0).

### The three hard prohibitions

These are the failure modes that cannot be undone by a re-run, so they are stated before the procedure rather than inside it:

1. **Never `git rm -r plan/`, and never `git rm plan/followups.yaml` or `git rm plan/manifest.yaml`.** `core-server`'s own `main` tracks **14** `plan/` paths. `plan/followups.yaml` and `plan/manifest.yaml` are both conflicts resolved `--ours` — `plan/manifest.yaml` is *not* a silent identical merge (donor tip `914f951` added a `dependencies` block to its own entry; see the Purpose-and-scope correction) but it is still not residue, and `--ours` is still the correct, lossless-for-`core-server` resolution. The `plan/` removal set is exactly the two `plan-summary-*.md` files named in step 5.
2. **Never hand-edit inside a conflict marker.** All 14 conflicts are resolved by taking `core-server`'s side wholesale. The substance `--ours` discards from four of them is carried forward by other tasks and phases, recorded in the commit message (step 7), not merged by hand here.
3. **Never remove `docs/dev-core-consolidation-contract.md` or `docs/consumer-migration.md`.** Both arrive clean and are deliberately kept through this phase; their disposition is Phase 6's. Deleting the absorption recipe in the commit that follows it is self-defeating.

### The measured arrival map this task must reproduce

| Disposition | Count | Handling |
|---|---|---|
| `add/add` conflict | 14 | `git checkout --ours` (step 4) |
| Clean arrival, needs a decision | 10 | 8 removed (step 5), 2 kept |
| Clean arrival, absorbed component tree | 159 | none — this is the merge working |
| Untouched `core-server`-only paths | 110 | none |

Net staged delta against `HEAD` at commit time: **161 additions and nothing else** — the 159 component-tree paths plus `docs/consumer-migration.md` and `docs/dev-core-consolidation-contract.md`.

## Procedure

### Step 0 — pre-flight

```bash
git rev-parse --abbrev-ref HEAD                     # the task branch; MUST NOT be plan/sdlc-core-unification
git status --porcelain                              # must be empty
git ls-tree -r --name-only HEAD -- plan | wc -l     # must be 14
git ls-tree -r --name-only HEAD -- src | wc -l      # record; core-server's pre-merge src count
```

Halt and report if the branch is `plan/sdlc-core-unification`, if the tree is dirty, or if the `plan/` count is not 14.

### Step 1 — add the donor remote and fetch

```bash
git remote add dev-core-source /Users/zane/playground/sdlcforge/dev-core
git fetch dev-core-source main
git rev-parse dev-core-source/main
```

If the remote already exists, use `git remote set-url dev-core-source /Users/zane/playground/sdlcforge/dev-core` instead of `add`. Expected donor tip: **`914f951`** (`plan(sdlc-core-unification): patch manifest entry`) — updated 2026-09-06; the tip previously recorded here, `5d5c2a3`, has already advanced past by exactly this one commit, whose only effect is documented in the Purpose-and-scope correction above. If the tip differs from `914f951`, the arrival map may be stale again — re-run the verification in steps 2 and 3 and report any divergence from the counts in this document before proceeding.

Leave the remote in place afterwards; do **not** `git remote remove` it. This matches the `liq-controls` / `liq-credentials` / `liq-integrations-issues-github` remotes the predecessor absorptions left behind.

### Step 2 — confirm the donor tree shape (blocking gate)

The recipe's step-1 donor-side relocation is not needed only because dev-core's `main` already carries the final absorbed layout. Merging a pre-restructure tree writes every file to the wrong path and has to be undone by hand, so this is a gate, not a formality:

```bash
git ls-tree -r --name-only dev-core-source/main -- src | awk -F/ '{print $2}' | sort | uniq -c
```

Expected, exactly:

```text
   1 index.mjs
  20 orgs
  58 projects
  10 projects-audit
   2 test
  71 work
```

That is 162 tracked paths under `src/`. Also confirm the 21 non-`src/` paths:

```bash
git ls-tree -r --name-only dev-core-source/main | grep -cv '^src/'    # must be 21
```

Halt if a `src/handlers/` directory or any layout other than the above appears.

### Step 3 — run the merge and confirm the conflict set

```bash
git merge --allow-unrelated-histories --no-commit dev-core-source/main
```

Expect 14 `CONFLICT (add/add)` lines and `Automatic merge failed; fix conflicts and then commit the result.` Then:

```bash
git diff --name-only --diff-filter=U | sort
```

Must print exactly these 14 paths and no others:

```text
.gitignore
Makefile
README.md
docs/architecture.md
make/10-locations.mk
make/10-resources.mk
make/15-data-finder.mk
make/20-js-src-finder.mk
make/55-lint.mk
make/55-test.mk
make/95-final-targets.mk
package.json
plan/followups.yaml
plan/manifest.yaml
```

Any extra or missing path means the donor tip or `core-server`'s `main` moved since the inventory was measured. Halt and report the difference rather than improvising a resolution.

### Step 4 — resolve all 14 conflicts `--ours`

`git checkout --ours` does not stage, so the `git add` is required:

```bash
CONFLICTS=".gitignore Makefile README.md docs/architecture.md \
make/10-locations.mk make/10-resources.mk make/15-data-finder.mk \
make/20-js-src-finder.mk make/55-lint.mk make/55-test.mk make/95-final-targets.mk \
package.json plan/followups.yaml plan/manifest.yaml"

git checkout --ours -- $CONFLICTS
git add -- $CONFLICTS
```

Verify the resolution is byte-exact `core-server` content, not a hand-merge — every resolved path's staged blob must equal its `HEAD` blob:

```bash
for p in $CONFLICTS; do
  a=$(git rev-parse "HEAD:$p"); b=$(git rev-parse ":0:$p")
  [ "$a" = "$b" ] && echo "OK    $p" || echo "MISMATCH $p ours=$a staged=$b"
done
git diff --name-only --diff-filter=U          # must be empty
grep -l '^<<<<<<< ' $CONFLICTS                # must print nothing
```

Four of these carry substance `--ours` silently discards. They are handed forward, not lost — record each in step 7's commit message:

| Path | What `--ours` discards | Where it goes |
|---|---|---|
| `package.json` | dev-core's 32-name dependency set and its 4-component plugin manifest | dependency union → task 003; component declarations → Phase 3 |
| `plan/followups.yaml` | 22 live dev-core followups, no ID collisions with `core-server`'s 30 | re-filed through the followups tool → task 002 |
| `README.md` | dev-core's per-submodule route tables, the `projects-audit` → `projects` dependency section | Phase 6 (`doc-updates`) |
| `docs/architecture.md` | dev-core's submodule decomposition, composite-`setup` ordering contract, `app.ext` service contracts | Phase 6 (`doc-updates`) |

The remaining ten are `--ours` with nothing to carry forward. `.gitignore` was verified lossless (`core-server`'s 10 entries are a strict superset of dev-core's 6). `plan/manifest.yaml` discards dev-core's own `dependencies` annotation on its own plan-registry entry (a scheduling note for dev-core's own retirement task, tracked independently and authoritatively in dev-core's separate, un-merged repository — not information `core-server` needs to hold). One resolution has a plausible functional consequence and is checked by task 004, not here: `make/55-test.mk`'s Babel invocation carries `--ignore='**/test/data/**' --ignore='**/test-data/**'` on dev-core's side and not on `core-server`'s, and dev-core brings test-data fixture trees.

### Step 5 — apply the exact eight-path removal set

```bash
git rm -f -- \
  .sdlc-data.yaml \
  make/50-dev-core-js.mk \
  package-lock.json \
  plan/plan-summary-dev-core-plugin-manifest.md \
  plan/plan-summary-orgs-defects-remediation.md \
  src/index.mjs \
  src/test/index.test.mjs \
  src/test/plugin-manifest.test.mjs
```

`-f` is required: these paths are staged by the merge but absent from `HEAD`, so a bare `git rm` refuses. Why each one goes:

- `.sdlc-data.yaml` — dev-core's generator inventory. `core-server`'s equivalent is the differently-named `.catalyst-data.yaml`, which survives untouched.
- `make/50-dev-core-js.mk` — would add a third Rollup target building `dist/dev-core.js`, picked up automatically by `Makefile`'s `include make/*.mk`.
- `package-lock.json` — `core-server` is on Bun and tracks `bun.lock`. The risk is not an overwrite (dev-core has no `bun.lock`) but the inverse: an inert npm lockfile sitting beside `bun.lock` misleading a later `npm install`.
- the two `plan-summary-*.md` files — dev-core plan residue. These two and nothing else.
- `src/index.mjs` — dev-core's own plugin aggregator, whose role is taken by `src/lib/builtin-plugins.mjs`. This is the *inverse* of the contract's stated `projects-audit` hazard: `core-server` has no file at this path, so it arrives as a clean add and `git rm` is correct here where it would have been catastrophic there.
- `src/test/index.test.mjs` — cannot survive this phase in any form (its first import is `from '../index'`), and its aggregate assertions have nothing to assert against yet: the four absorbed submodules are still absent from `builtin-plugins.mjs`' `submodules` array. **Its assertions are carried into Phase 3's scope** — say so in the commit message.
- `src/test/plugin-manifest.test.mjs` — dropped outright, not ported. It is a drift guard over `plugable.components[…]`, a plugin-side manifest shape `core-server` does not have and will not have; 12 of its 17 assertions are vacuous passes against an empty finding set. Its job is already done by `core-server`'s `src/lib/test/host-declaration.test.js` and `src/lib/test/plugin-graph-gate.test.js`.

### Step 6 — pre-commit verification

```bash
# plan/ is exactly as it was: 14 core-server paths, zero net change
git diff --cached --name-status HEAD -- plan          # must print nothing at all
git ls-tree -r --name-only HEAD -- plan | wc -l       # still 14

# the three paths a careless resolution could clobber came through untouched
for p in src/lib/index.js bun.lock .catalyst-data.yaml; do
  a=$(git rev-parse "HEAD:$p"); b=$(git rev-parse ":0:$p")
  [ "$a" = "$b" ] && echo "UNTOUCHED $p ($a)" || echo "CLOBBERED  $p"
done

# the whole staged delta: 161 paths, every one an addition
git diff --cached --name-status HEAD | wc -l          # must be 161
git diff --cached --name-status HEAD | grep -cv '^A'  # must be 0

# and the additions decompose as expected
git diff --cached --name-only HEAD | grep -c '^src/projects/'        # 58
git diff --cached --name-only HEAD | grep -c '^src/work/'            # 71
git diff --cached --name-only HEAD | grep -c '^src/orgs/'            # 20
git diff --cached --name-only HEAD | grep -c '^src/projects-audit/'  # 10
git diff --cached --name-only HEAD | grep -v '^src/'                 # exactly the 2 kept docs/ files

# the removed paths are gone from the working tree
ls .sdlc-data.yaml package-lock.json make/50-dev-core-js.mk src/index.mjs src/test 2>&1  # all "No such file"
```

The expected blob SHAs for the untouched trio are `src/lib/index.js` → `e8791e8`, `bun.lock` → `901e082`, `.catalyst-data.yaml` → `41b9a23`. Cross-check against `plan/resources/pre-merge-root-blob-map.md`, Phase 1's recorded map; note that Phase 1's own tasks change `bun.lock`'s blob (the yalc-snapshot refresh) and `src/controls/handlers/orgs/controls/list-implied.mjs`'s blob, so that map's `bun.lock` row is expected to differ from `901e082`. The `HEAD` comparison above is authoritative either way — it compares against whatever this branch was actually cut from.

Halt and report on any mismatch. Do not commit a merge whose staged delta is not exactly 161 additions.

### Step 7 — commit the merge

```bash
git commit -F - <<'EOF'
merge(dev-core): absorb @sdlcforge/dev-core with history preserved

Merges dev-core-source/main (914f951) into core-server with
--allow-unrelated-histories, bringing src/{projects,orgs,work,projects-audit}/
into the tree with the donor's full history reachable under the absorbed paths.

Nothing is wired: src/lib/builtin-plugins.mjs still aggregates three components
and @sdlcforge/dev-core is still an explicit npm plugin, so the absorbed source
is inert and server behavior is unchanged.

Conflicts (14, all add/add) resolved --ours, byte-identical to core-server's
pre-merge blobs: .gitignore, Makefile, README.md, docs/architecture.md,
make/{10-locations,10-resources,15-data-finder,20-js-src-finder,55-lint,
55-test,95-final-targets}.mk, package.json, plan/followups.yaml,
plan/manifest.yaml.

plan/manifest.yaml is not a silent identical merge here: the donor's main
advanced past this plan's originally-measured tip (5d5c2a3) to 914f951, whose
sole change added a `dependencies` block to dev-core's own plan/manifest.yaml
entry for this same sdlc-core-unification plan-group, recording that dev-core's
own retirement task must not run until this plan's Phase 4 verification lands.
That is a scheduling note for dev-core's own execution, tracked independently
and authoritatively in dev-core's separate, un-merged repository -- nothing
core-server needs to hold, so --ours (discarding it here) loses nothing.
core-server's own 14 tracked plan/ paths are unchanged.

Removed (8 clean arrivals with no core-server counterpart):
  .sdlc-data.yaml                                 dev-core generator inventory
  make/50-dev-core-js.mk                          third Rollup target
  package-lock.json                               core-server is on Bun
  plan/plan-summary-dev-core-plugin-manifest.md   dev-core plan residue
  plan/plan-summary-orgs-defects-remediation.md   dev-core plan residue
  src/index.mjs                                   superseded by builtin-plugins.mjs
  src/test/index.test.mjs                         see carried-forward below
  src/test/plugin-manifest.test.mjs               plugin-side manifest guard, superseded

Kept deliberately, disposition deferred to the doc-updates phase:
docs/dev-core-consolidation-contract.md, docs/consumer-migration.md.

Carried forward rather than discarded by the --ours resolutions:
  - package.json: the 32-name runtime dependency union is a following task in
    this phase; the seven-component host declaration is Phase 3's.
  - plan/followups.yaml: dev-core's 22 live followups are re-filed into
    core-server's registry through the followups tool by a following task in
    this phase. --ours alone would drop them.
  - README.md, docs/architecture.md: dev-core's route tables, submodule
    decomposition, composite-setup ordering contract, and app.ext service
    contracts are folded in during the doc-updates phase.
  - src/test/index.test.mjs: its assertions (fresh-array aggregation, no
    duplicate (method, path) pair, projects-audit route set, composite setup
    ordering, app.ext contract freezes) are carried into Phase 3, to be added to
    the existing src/lib/test/builtin-plugins.test.js rather than reconstituted
    as a parallel src/test/ tree.

20 absorbed *.test.mjs/*.test.js suites begin executing under core-server's
Jest run from this commit, on top of core-server's existing 17.
EOF
```

### Step 8 — verify history preservation

This is the whole reason a merge is used rather than a copy, so it is verified rather than assumed:

```bash
for f in src/projects/handlers/_lib/create-lib.mjs \
         src/orgs/setup.mjs \
         src/work/handlers/resume.mjs \
         src/projects-audit/handlers/_lib/audit-lib.mjs; do
  n=$(git log --follow --format=%H -- "$f" | wc -l | tr -d ' ')
  oldest=$(git log --follow --format=%H -- "$f" | tail -1)
  if git merge-base --is-ancestor "$oldest" dev-core-source/main; then
    echo "OK   $f — $n commits, oldest $oldest reachable from donor"
  else
    echo "FAIL $f — oldest $oldest is not a donor commit"
  fi
done
```

All four must report `OK` with `n` greater than 1. A single-commit history means the merge did not preserve the donor's history and the task has failed its central goal.

## Validation

1. Step 0's pre-flight passed: the branch is not `plan/sdlc-core-unification`, the tree was clean, and `plan/` held 14 tracked paths.
2. Step 2's donor tree shape matched exactly (162 `src/` paths in the `{projects: 58, orgs: 20, work: 71, projects-audit: 10, index.mjs: 1, test: 2}` shape; 21 non-`src/` paths).
3. `git diff --name-only --diff-filter=U | sort` produced exactly the 14 listed conflict paths, and after resolution produced nothing.
4. Every one of the 14 resolved paths' staged blob equals its `HEAD` blob (step 4's loop prints `OK` 14 times); `grep -l '^<<<<<<< '` over the 14 prints nothing.
5. `git diff --cached --name-status HEAD -- plan` printed nothing, and `git ls-tree -r --name-only HEAD -- plan | wc -l` is 14 before the commit.
6. `src/lib/index.js`, `bun.lock`, and `.catalyst-data.yaml` are byte-identical to `HEAD` (`e8791e8`, `901e082`, `41b9a23` as measured pre-Phase-1; the `HEAD` comparison, not the literal SHA, is the check).
7. `git diff --cached --name-status HEAD | wc -l` is **161** and every line begins with `A`; the non-`src/` additions are exactly `docs/consumer-migration.md` and `docs/dev-core-consolidation-contract.md`.
8. All eight removal-set paths are absent from the working tree and from `git ls-files` after the commit; `src/test/` no longer exists.
9. `git ls-files | grep -c '^src/'` equals the pre-merge `src/` count plus 159.
10. The merge commit has two parents (`git rev-list --parents -n 1 HEAD` prints three SHAs), and its commit message enumerates the 14 resolutions, the 8 removals, the 2 deliberate keeps, and all four carried-forward items.
11. Step 8's `git log --follow` check reports `OK` for all four sampled absorbed files.
12. `git status --porcelain` is empty after the commit.

## Metadata

architectural_impact: true

## Assumptions

- Phase 1 has landed on `main`: the `list-implied.mjs` `npm-toolkit` fix, the cleared yalc drift, the one-entry `ALLOWLISTED_ERROR_FINDINGS`, the parity contract, and the pre-merge blob map. This task's worktree branch is cut from that `main`.
- `node_modules` is **not** provisioned in this worktree and does not need to be. This task runs no build, no test, and no lint — that gate is task 004's, deliberately, because the dependency union has not landed yet and 20 newly-collected test suites make an intermediate run uninformative. Do not run `bun install` or `make` here.
- `src/projects/handlers/_lib/test/project-lifecycle.test.mjs` is a known-failing suite in the donor (dev-core followup `2aMD`: its `appMock` supplies `app.ext.serverHome` while `create-lib.mjs` reads `app.ext.serverConfigRoot`). It arrives with the merge and is expected to fail once tests run. That is an inherited pre-existing defect, not merge-induced, and it is task 004's to characterize — not this task's to fix.
- The donor is at `914f951` (updated 2026-09-06 after a real dispatch measured the live tip; see the Purpose-and-scope correction). `core-server`'s `main` was at `4ded354` when the arrival map was first measured, then at `08e5ee1` (a mid-plan checkpoint commit landing Phase 1's actual source/test/lockfile changes onto `main`, per operator decision, ahead of this task) when this task's own worktree was cut. Neither move affects any count in this document (Phase 1 touches `src/controls/…`, `src/lib/test/…`, `test/__snapshots__/…`, and `bun.lock`; the donor's one new commit touches only `plan/manifest.yaml`; none collide with any arriving path).

## References

- [`notes/merge-arrival-inventory.md`](../notes/merge-arrival-inventory.md) — the authority for every count, path list, and disposition in this document. Produced by running this exact merge in a throwaway clone. Git's own conflict list is *not* the review list; this note is.
- [`phases/absorb-dev-core.md`](../phases/absorb-dev-core.md) — the phase this task opens; goals 1, 2, 4, and 5.
- [`notes/pre-merge-state.md`](../notes/pre-merge-state.md) — the planning-time snapshot. Its "an identical generated fragment merges silently" claim is superseded; the correction is at the head of the note.
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the absorption recipe, sections "Absorption recipe" and "Root-file ownership". Read for context, but where it and the arrival inventory disagree (the `file:` gate, the `plan/` removal scope, the donor-side relocation step), the inventory governs.
- `plan/plan-summary-core-server-domain-consolidation.md` — the predecessor absorption of three donors into this same repository; the working model for how these merges land here.
