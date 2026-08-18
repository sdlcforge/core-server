# Make Test Fixture Reproducible From Git

## Purpose and scope

**Executes in the `liq-work` repository** (`/Users/zane/playground/liquid-labs/liq-work`), in this task's own worktree.

`src/handlers/work/_lib/test/data/playground/orgA/proj1` is tracked as a **gitlink** (mode `160000`, commit `4805e78`) with **no `.gitmodules` entry**. Its real content — a `package.json` and a nested `.git/` on branch `orgA/proj1/1` — exists only in this one working tree, created in 2023. Make that fixture reproducible from git, so `determine-projects.test.js` passes from a fresh clone of `liq-work` and, after phase 8, from a fresh clone of `dev-core`.

This is a **prerequisite**, not a nicety. Proved at plan-authoring time:

- `git clone --no-hardlinks <liq-work> /tmp/lw-clone` yields an **empty** `…/orgA/proj1/` directory.
- A rehearsed `git merge --allow-unrelated-histories` of `liq-work/main` into a clone of `sdlcforge/dev-core` carries the gitlink across verbatim and materialises the same **empty** directory.

So `determine-projects.test.js` — the only suite that passes today — dies on absorption. Worse than dying: a fixture directory with **no** `.git` inside a checkout makes ``git branch | grep '*' | cut -d' ' -f2`` resolve against the **enclosing repository** and return *its* branch name, so the test could "pass" for entirely the wrong reason, or fail with a baffling assertion diff. Fixing this before the relocation is what keeps phase 8 task 001 a pure `git mv`.

This task has **no dependency on any other slice** and is unblocked today.

## Requirements

1. **Read the failure mode before changing anything.** Confirm the starting state with your own eyes, and record the output in the task report:
   - `git ls-files -s src/handlers/work/_lib/test/data/` → shows `160000 4805e789… 0 src/handlers/work/_lib/test/data/playground/orgA/proj1` alongside the ordinary `100644` entry for `work-db-a/work-db.yaml`.
   - `git submodule status` → errors, `no submodule mapping found in .gitmodules for path '…/proj1'`.
   - `ls -a src/handlers/work/_lib/test/data/playground/orgA/proj1` → `.git`, `package.json`, `subdir/`.
   - `cd` into that directory and run `git branch --show-current` → `orgA/proj1/1`; `git ls-files` → `package.json` only; `git log --oneline` → one commit, `4805e78`.

2. **Untrack the gitlink and remove the nested repository.** These are one step, not two, because **git will not track files beneath a directory containing a `.git/`** — verified: `git add proj1/package.json` fails with `error: … is in submodule`. So:

   ```
   git rm --cached src/handlers/work/_lib/test/data/playground/orgA/proj1
   rm -rf src/handlers/work/_lib/test/data/playground/orgA/proj1/.git
   ```

   **This deletes untracked content from the user's working tree.** It is a 2023 test fixture with one reproducible commit and no remote (`git remote -v` is empty), so nothing unique is lost — but say so explicitly in the task report, and if `git log` in that nested repo shows anything beyond the single `4805e78` "added package" commit, **halt and report** instead of deleting.

3. **Commit the fixture's real content as ordinary tracked files.** After requirement 2, `git add` the file:

   ```
   src/handlers/work/_lib/test/data/playground/orgA/proj1/package.json
   ```

   Preserve its bytes exactly as they are today (`{\n  "name": "@orgA/proj1"\n}` with **no** trailing newline). Do not reformat it, do not add fields. Leave the empty `subdir/` alone — git does not track empty directories, nothing reads it, and inventing a placeholder file inside it would be unrequested content. Likewise leave the sibling empty `…/orgA/proj2/` directory alone; test row 4 passes `['orgA/proj2']` but with `all: true`, which overrides it, so it is never read.

4. **Make the test create the fixture repository at run time.** The suite runs from `test-staging/`, which is gitignored and rebuilt from scratch on every `make test`, so initialising a git repository there is free and self-cleaning. Add an idempotent initialiser that runs before the test cases — a `beforeAll` in `determine-projects.test.js` is the smallest change; a shared helper under `src/handlers/work/_lib/test/lib/` is acceptable if you prefer, and phase 7 task 002 may want the same helper.

   The initialiser must:
   - be a no-op when `<fixture>/.git` already exists (so it stays correct if a stale copy is ever present);
   - `git init` with the initial branch set to **`orgA/proj1/1`** (`git init -q -b 'orgA/proj1/1'` — the slashes are a valid ref name);
   - stage and create **at least one commit**, using per-command identity so it cannot depend on or disturb the user's global git config (`git -c user.email=… -c user.name=… commit`), and set `commit.gpgsign=false` for the same reason;
   - produce no output on success.

   **The commit is not optional.** `determineCurrentBranch` in `@liquid-labs/git-toolkit` is ``tryExec(`cd '${projectPath}' && git branch | grep '*' | cut -d' ' -f2`)``, and `git branch` prints nothing at all on an unborn branch. Read that function before you write the initialiser: `/Users/zane/playground/liquid-labs/git-toolkit/src/branch-and-remotes-lib.js:19-25`.

   Use `node:child_process`'s `execSync` (or `execFileSync`) rather than adding a dependency; this is test-only code and `shelljs` is already a Wave-4 removal target.

5. **Add a positive assertion that the fixture is the fixture.** The silent-wrong-answer failure mode above is the real hazard, so the test must not merely happen to work. Assert, before the `test.each` rows run, that `determineCurrentBranch({ projectPath: <fixture> })` — or an equivalent direct `git branch` read at the fixture path — returns exactly `'orgA/proj1/1'`. A future regression that loses the fixture then fails with a legible message instead of an inscrutable expectation diff.

6. **Change nothing else.** No production module is touched. `determine-projects.mjs`, `work-db.mjs`, every handler, `package.json`, and `Makefile` are all out of scope. Do not "fix" the `throw` expression in `determine-projects.test.js`'s `workDB.requireData` mock (`key === 'orgA/proj1/1' ? mockWorkUnit : throw new Error(…)`) — it compiles today under this package's Babel configuration and changing it is unrequested scope. Do not fix, work around, or comment on the `work-db.test.js` `SlowBuffer` failure; see `## Assumptions`.

7. **Record the resulting numbers** in the task report: `git ls-files src | wc -l` before and after (expect **69 → 69**: one gitlink entry removed, one real file added), and the full `make test` summary line.

## Validation

- **The gitlink is gone and the content is tracked.** `git ls-files -s src | grep '^160000'` returns **nothing**. `git ls-files src/handlers/work/_lib/test/data/` lists exactly two paths: `…/playground/orgA/proj1/package.json` and `…/work-db-a/work-db.yaml`. `git submodule status` returns cleanly (no output, no error).
- **The suite passes from a fresh clone.** This is the point of the task and must be demonstrated, not asserted. Clone the task branch to a scratch directory outside the repository, install, and run the suite there:

  ```
  git clone --no-hardlinks -b <task-branch> /Users/zane/playground/liquid-labs/liq-work /tmp/lw-verify
  cd /tmp/lw-verify && npm install && make test
  ```

  `determine-projects.test.js` must **pass** in that clone, all 6 tests. Record the summary line. If `npm install` is refused or too slow in the environment, an acceptable — and nearly as strong — substitute is: in the working checkout, `make test` once, then `rm -rf test-staging/handlers/work/_lib/test/data/playground/orgA/proj1/.git`, then re-run only that suite from `test-staging/` and confirm it still passes because the initialiser rebuilt the repository. Say in the report which of the two you did.
- **The fixture assertion works.** Deliberately break it once — e.g. temporarily change the initialiser's branch name to `main` — and confirm requirement 5's assertion fails with a legible message naming the wrong branch. Restore, re-run, confirm green. Report both observations.
- **Test count is unchanged.** `make test` reports the same **6 passing tests** in `determine-projects.test.js`. A different number means a `test.each` row was dropped or duplicated.
- **The known failure set is unchanged.** `make test` still reports exactly `Test Suites: 1 failed, 1 passed, 2 total`, with the single failure being `work-db.test.js`'s `TypeError: Cannot read properties of undefined (reading 'prototype')` from `buffer-equal-constant-time`. **A second failing suite, or a different error, is a regression from this task.**
- **Build and lint stay green.** `make build` produces `dist/liq-work.js`; `make lint` is clean, including the new/modified test code.
- **No production source changed.** `git diff --stat` against the phase's base shows changes confined to `src/handlers/work/_lib/test/` (and, if you added one, a new file under `src/handlers/work/_lib/test/lib/`). No `.mjs` outside `test/` appears in the diff.
- **The user's git config was not touched.** `git config --global --list` is unchanged, and the fixture initialiser used `-c` flags rather than `git config` writes. Confirm no stray commits landed in any repository other than the intended task branch.

## Metadata

architectural_impact: false

## Assumptions

- **`work-db.test.js` fails today and must keep failing in exactly the same way.** On Node v26.5.0 it cannot even load: `buffer-equal-constant-time` dereferences `SlowBuffer.prototype`, and `SlowBuffer` was removed from `node:buffer` in Node 24. The chain is `work-db.mjs → @liquid-labs/github-toolkit → @liquid-labs/octocache → octokit → @octokit/auth-app → universal-github-app-jwt → jsonwebtoken → jws → jwa`. This is environment-wide (it breaks 5 of `liq-projects`'s 8 suites too), pre-existing, and explicitly **out of scope** — D11 forbids dependency changes and the remedy is a plan-group-level decision already flagged to the manager. Do not add an `overrides` entry, a Jest `setupFiles` polyfill, or a `jest.mock`. Treat it as the constant it is.
- **The nested `.git/` may be deleted.** It has no remote, one commit, and a single tracked file whose content is being preserved. Requirement 2 nonetheless requires you to look before you delete and to halt on anything unexpected.
- `make` and `npx` work in this checkout against the existing `node_modules` — verified at plan-authoring time (`make build` and `make lint` pass). A toolchain failure is an environment problem to report, not a reason to reinstall or upgrade anything.
- Creating a git repository under `test-staging/` is safe: `/test-staging` is in `.gitignore` in liq-work and will be in dev-core's too (D3), and `make test` `rm -rf`s the directory on every rebuild.
- This task does **not** need `liq-projects` phase 1, dev-core, or any other slice. Do not wait on them.

## References

- `plan/notes/liq-work-source-inventory.md` — section **W5/D2** for the full gitlink evidence and the clone/merge rehearsals, **W5** for the measured baseline, **W8/C6** for why this generalises to the next donor.
- `/Users/zane/playground/liquid-labs/git-toolkit/src/branch-and-remotes-lib.js` — `determineCurrentBranch` (lines 19-25); read it before writing the initialiser.
- `/Users/zane/playground/liquid-labs/liq-work/src/handlers/work/_lib/determine-projects.mjs` — which of the five `test.each` rows need a git repo (those with `workKey === undefined`) and which need `package.json` (those reaching `getPackageJSON(currDir)`).
- `/Users/zane/playground/liquid-labs/liq-work/Makefile` — the `CATALYST_JS_TEST_DATA_SRC` / `CATALYST_JS_TEST_DATA_BUILT` rules that copy `*/test/data/*` into `test-staging/`, i.e. why the fixture works today and why `test-staging` is a safe place to `git init`.

## Checkpoint hints

- After requirement 1's inspection, with the starting state recorded and before anything is removed.
- After the untrack + nested-`.git` removal + `git add` of `package.json`, with `git ls-files -s src | grep '^160000'` empty.
- After the runtime initialiser and the fixture assertion are written and `make test` reproduces the 6 passing tests.
- After the fresh-clone (or `.git`-removal) demonstration, with its output recorded.
