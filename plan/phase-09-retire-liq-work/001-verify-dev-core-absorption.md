# Verify Dev-Core Absorption

## Purpose and scope

**Executes in the `liq-work` repository** (`/Users/zane/playground/liquid-labs/liq-work`), and **reads** the `sdlcforge/dev-core` checkout (`/Users/zane/playground/sdlcforge/dev-core`) without modifying it.

The read-only gate for phase 9. Confirm that `@sdlcforge/dev-core` actually carries everything `@liquid-labs/liq-work` had — every file, every route, the path var, the `WORK_DB_PATH` contract, the dependency union, the inlined `crossLinkDevProjects`, the reproducible test fixture, and the git history — **before** anything irreversible or misleading happens. Everything after this task is either irreversible (`npm publish`, `npm deprecate`) or actively wrong if premature (a superseded notice pointing at a package that does not yet carry the code).

**This task edits nothing.** It produces a verdict and a report. On any gap it **halts the phase** and reports precisely what is missing rather than attempting a repair — repairs belong to phases 7 and 8, re-run.

## Requirements

1. **Verify the file census and content equality.** In dev-core, `git ls-files src/work` returns exactly liq-work's post-restructure `src/` set minus the root `src/index.js` — take the expected count from task 8-001's recorded census, not from a plan document. Then cross-check content: `diff -r <liq-work>/src/work <dev-core>/src/work` must report **no differences**. This donor required no post-move content edit, so byte equality is the correct expectation (unlike the `liq-projects` slice, which had one forced `npmName` fix).

   Also confirm the structural cleanups: `git ls-files src/handlers` in dev-core returns nothing; `git ls-files -s | grep '^160000'` returns nothing (no gitlink survived); `git ls-files | grep '^plan/'` returns nothing (correction C4).

2. **Verify the route surface — 30 routes, no duplicates.** dev-core's built bundle registers all 30 `/work` routes with byte-identical `path` arrays **and methods**. Extract both lists mechanically and `diff` them; do not eyeball. The expected set is in the source inventory's W1 — spot-check that it includes the shapes most likely to be mangled by a careless edit:

   - `POST ['work', 'start']` and `PUT ['work', ':workKey', 'resume']` — the two explicit-only operations
   - `GET ['work', ':workKey', 'issues', 'list']` / `GET ['work', 'issues', 'list']` — a nested collection's explicit/implied pair
   - `DELETE ['work', ':workKey', 'projects', 'remove']` — the deepest path
   - `POST ['work', ':workKey', 'submit']` / `POST ['work', 'submit']` — the only non-`PUT` lifecycle pair

   Then confirm **no `(method, path)` pair is registered twice** anywhere in the merged handlers array. The aggregator building a fresh array from multiple submodules is exactly where an accidental duplicate would appear, and per correction C1 a duplicate **crashes** any server that loads it (`Non-unique command path: …`) rather than silently shadowing.

3. **Verify the setup and path-var contracts.** Against a stub `app`, dev-core's composite `setup`:
   - runs the `work` submodule setup **third**, after `projects` and `orgs` (for whichever have landed) and before `projects-audit` (which has no setup at all);
   - sets `app.ext.constants.WORK_DB_PATH` to exactly `<stub serverConfigRoot>/work/work-db.yaml` — assert the key path is exactly `app.ext.constants.WORK_DB_PATH`, the D7-frozen contract;
   - calls `registerPathVar('workKey', …)` **exactly once**, with `validationRe` byte-identical to `work-[^/]+(?:/|%2[Ff])[^/]+(?:/|%2[Ff])[0-9]+` and an `optionsFetcher` present;
   - and registers **no** path-var name twice across the whole merged plugin (`parameterKey` will legitimately be absent from this set — it is registered from a `liq-orgs` handler `func` at registration time, not from `setup`; correction C3).

4. **Verify the dependency union.** dev-core's `package.json`:
   - carries `@liquid-labs/condition-eval ^1.0.0-alpha.17` and `@liquid-labs/plugable-defaults ^1.0.0-alpha.4` (new to dev-core from liq-work);
   - carries `@liquid-labs/github-toolkit` at **`^1.0.0-alpha.25`** — liq-work's higher range, per D4;
   - carries `http-errors` (used by 16 liq-work modules but never declared in liq-work's own manifest; it must be present in dev-core for the `work` submodule to resolve);
   - does **not** carry `@liquid-labs/liq-projects-lib` — its absence is the proof that phase 7 task 002 did its job. Also `grep -rn "liq-projects-lib" src/` in dev-core returns nothing;
   - does **not** carry `@liquid-labs/terminal-text` or `octokit` (both declared-but-unused in liq-work; their omission was deliberate).

   Confirm `package-lock.json` is consistent (`npm ci --dry-run` or equivalent), and record the **resolved** `@liquid-labs/github-toolkit` version from the lockfile so the raise is auditable.

5. **Verify `crossLinkDevProjects` is present as inlined source, not as a dependency.** `src/work/handlers/_lib/cross-link-dev-projects.mjs` exists in dev-core and `diff`s clean against `/Users/zane/playground/liquid-labs/liq-projects-lib/src/cross-link-dev-projects.mjs` (or differs only by the minimal lint-forced change phase 7 task 002 recorded — check that task's report). `src/work/handlers/_lib/work-db.mjs` imports it relatively, not from `@liquid-labs/liq-projects-lib`. Confirm the function's body is actually in `dist/dev-core.js` (grep for its distinctive `Was asked to cross-link` error string) — an externals misconfiguration that dropped it would be invisible until runtime.

6. **Verify the test fixture is reproducible in dev-core.** This is the specific thing phase 7 task 001 existed to guarantee, and it must be checked in dev-core rather than assumed. Clone dev-core to a scratch directory, install, and run the suite there; `src/work/handlers/_lib/test/determine-projects.test.js` must **pass** all 6 tests with no manual fixture setup. If a full `npm install` in a clone is impractical, the acceptable substitute is: in dev-core, `make test` once, then `rm -rf test-staging/work/handlers/_lib/test/data/playground/orgA/proj1/.git`, then re-run that suite and confirm it still passes because the runtime initialiser rebuilt the repository. Say which you did.

7. **Verify history preservation.** In dev-core, `git log --follow` on each of `src/work/handlers/_lib/work-db.mjs`, `src/work/setup.mjs`, and `src/work/handlers/save.mjs` reaches pre-plan `liq-work` commits. A `--follow` that stops at the merge commit means history was lost and the absorption must be redone.

8. **Verify dev-core's build and test state — against the right baseline.** `make build` produces `dist/dev-core.js`; `make lint` and `make qa` show no findings attributable to `src/work/`; and `make test` shows liq-work's three suites present, with `determine-projects.test.js` (6 tests) and `cross-link-dev-projects.test.js` (1 test) **passing** and `work-db.test.js` failing with the known `SlowBuffer` `TypeError`.

   **`make test` will not be green, and that is not a verification failure.** dev-core inherited failing suites from `liq-projects` before liq-work touched anything. Record the observed suite and test counts and compare them against task 8-002's recorded post-absorption numbers. The gate is *"matches 8-002's recorded state, and every failure is a `SlowBuffer` failure"* — **any** failure with a different error, especially a module-resolution error, is a gap.

9. **Verify the documentation landed.** dev-core's docs state the 30-route table, the `WorkDB` record shape and `workKey`-equals-`workBranch` identity, the `WORK_DB_PATH` contract, the `workKey` path var, and the unguarded 20-site `app.ext._liqProjects.playgroundMonitor` coupling — with phase 8 task 002's three corrections applied (`app.ext.integrations` is framework-owned, not `liq-integrations`-owned; the "Modernization status" speculation replaced; the guard described precisely). This is a gate, not a nicety: task 9-002 writes a superseded notice that *points readers at dev-core*, and pointing them at undocumented code would be worse than the status quo.

10. **Produce a verdict.** The report states, per numbered requirement, pass or fail with the evidence (command run, output observed). Any failure ⇒ **halt the phase**, name the specific gap, and name which phase 7 or 8 task owns fixing it. Do not proceed on a partial pass.

## Validation

- Every requirement above has a recorded command and its **actual output** in the task report — not a claim, an observation. A requirement marked "pass" without evidence is a failed verification.
- **Nothing was modified.** `git status --porcelain` is clean in **both** checkouts at the end of the task (allowing for gitignored build outputs — `dist/`, `test-staging/`, `qa/` — produced by running `make`). No commit and no branch was created in either repository. Any scratch clone was made outside both repositories and is cleaned up or named in the report.
- The route-parity, file-census, and `crossLinkDevProjects` comparisons were done by writing both sides to files and running `diff`, with the diff output (empty or not) recorded.
- The verdict is unambiguous: a single pass/fail line at the top of the report, followed by the per-requirement detail.
- The report distinguishes clearly between **known-and-accepted** failures (the `SlowBuffer` suites) and **gaps** (anything else), so a reader cannot mistake the former for the latter.

## Metadata

architectural_impact: false

## Assumptions

- **Phase 8 has fully landed and merged in both repositories.** If dev-core has no `src/work/` at all, that is not a verification failure to enumerate in detail — report immediately that phase 8 task 002 has not landed, and stop.
- **`make test` is red in dev-core and that is expected.** The `buffer-equal-constant-time` / `SlowBuffer` defect (Node ≥ 24; this environment runs v26.5.0) already fails 5 of `liq-projects`'s 8 suites and adds `work-db.test.js` to the set. It is pre-existing, environment-wide, out of scope under D11, and flagged to the manager. Verify *fidelity*, not *greenness*.
- **A `SlowBuffer` preload shim is required to load `dist/dev-core.js` at all**, for requirements 2, 3, and 5. Write it to a scratch path outside both repositories and use `node --require <shim> -e "…"`:

  ```js
  const buffer = require('node:buffer')
  if (buffer.SlowBuffer === undefined) {
    buffer.SlowBuffer = function SlowBuffer (n) { return Buffer.allocUnsafeSlow(n) }
    buffer.SlowBuffer.prototype = Object.create(Buffer.prototype)
  }
  ```

  **Never commit it** to either repository.
- **Running `make` targets in the dev-core checkout is acceptable** even though this task is otherwise read-only; the outputs are gitignored. If the checkout must stay pristine, run them in a scratch clone and say so.
- **The `work`-relative setup ordering check is conditional** on which other submodules have landed. If `orgs` has not been absorbed yet, verify only that `work` follows `projects`, and note the deferred check in the report.
- **Migrated defects are not verification failures.** The undeclared `http-errors` in liq-work's own manifest, `WorkDB#playgroundPath` (assigned, never read), and the two competing playground-resolution paths were all migrated deliberately under D11. Verify their *presence and fidelity*, not their correctness. Do not attempt live HTTP calls against any `/work` endpoint — most require GitHub credentials, network, and a real playground.

## References

- `plan/notes/liq-work-source-inventory.md` — the authoritative file census (**W2**), 30-route table (**W1**), dependency union (**W3**), `crossLinkDevProjects` evidence (**W4**), measured baseline and both defects (**W5**), `app.ext` contracts (**W7**), and corrections C1/C4/C5/C6 (**W8**).
- `plan/phase-08-liq-work-migration/002-absorb-work-into-dev-core.md` — the task whose outputs are being verified, including its recorded pre-merge baseline and post-absorption counts.
- `plan/phase-08-liq-work-migration/001-restructure-src-into-dev-core-layout.md` — the recorded post-restructure file census that requirement 1 compares against.
- `plan/phase-07-liq-work-pre-migration-remediation/001-make-test-fixture-reproducible.md` and `002-inline-cross-link-dev-projects.md` — the guarantees requirements 5 and 6 check.
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the committed contract; requirement 9's documentation gate is checked against dev-core's own docs.
- `/Users/zane/playground/liquid-labs/liq-orgs/worktrees/plan/dev-core-consolidation/plan/phase-06-retire-liq-orgs/001-verify-dev-core-absorption.md` — the sibling gate task.

## Checkpoint hints

- After the file census and content `diff` (requirement 1), since a failure there makes the rest moot.
- After the route, setup, path-var, and dependency checks (requirements 2–4).
- After the `crossLinkDevProjects` and fixture-reproducibility checks (requirements 5–6) — the two things unique to this slice.
- After the history and build/test checks (requirements 7–8), before writing the verdict.
