# Inline crossLinkDevProjects And Drop liq-projects-lib

## Purpose and scope

**Executes in the `liq-work` repository** (`/Users/zane/playground/liquid-labs/liq-work`), in this task's own worktree.

The plan-group's designated **special scope item**. Move `crossLinkDevProjects` out of `@liquid-labs/liq-projects-lib` and into `liq-work`'s own source, port its test, and remove the `@liquid-labs/liq-projects-lib` dependency entirely. This is the one piece of `liq-projects-lib`'s content that `dev-core` actually needs; the rest of that package is out of scope here and belongs to its own slice.

Doing it **here, in `liq-work`, before the relocation** rather than later in dev-core is deliberate and buys three things: phase 8 task 001 stays a pure `git mv`; phase 8 task 002's dependency union never has to consider `liq-projects-lib` at all; and `liq-projects-lib`'s own retirement slice is unblocked the moment this lands, independently of when dev-core's phase 1 lands.

This task has **no dependency on any other slice** and is unblocked today.

## Requirements

1. **Re-verify the premise before acting on it.** The wave manifest's claim was confirmed at plan-authoring time, but confirm it yourself — this task removes a dependency, and a missed usage breaks the package at import time:
   - `grep -rn "liq-projects-lib" src/` returns **exactly one** line: `src/handlers/work/_lib/work-db.mjs:13`.
   - `grep -rn "crossLinkDevProjects" src/` returns **exactly two** lines: the import at `work-db.mjs:13` and the call at `work-db.mjs:90` (inside `WorkDB#addProjects`, guarded by `if (noLink !== true)`).
   - `@liquid-labs/liq-projects-lib` appears in `package.json` `dependencies` at `^1.0.0-alpha.12` and nowhere else in the manifest.

   If any of these differs, **halt and report** rather than improvising a wider change.

2. **Copy the function verbatim** into a new file `src/handlers/work/_lib/cross-link-dev-projects.mjs`, sourced from `/Users/zane/playground/liquid-labs/liq-projects-lib/src/cross-link-dev-projects.mjs`.

   **Verbatim means verbatim.** Same signature `async ({ app, dryRun, projects, reporter })`, same three imports (`node:path`, `readFJSON` from `@liquid-labs/federated-json`, `tryExec` from `@liquid-labs/shell-toolkit`), same `reporter?.push(...)` optional-chaining, same `yalc publish` / `yalc add` shell-outs, same `export { crossLinkDevProjects }`. Do not rename it, do not tidy the `extarct` typo in its first comment, do not add JSDoc, do not convert `tryExec` to `node:child_process`, do not add a guard for the `app.ext._liqProjects` read. This is a **move**, and the phase-9 verification gate diffs it against the original.

   The one legitimate reason to deviate: if `make lint` rejects the copied file under liq-work's ESLint configuration, apply the **minimum** formatting change lint demands and report the exact diff. (Both packages share the `catalyst-scripts-node-project` lint config, so this is unlikely.)

3. **Rewrite the import in `work-db.mjs`.** Line 13 becomes a relative import of the sibling module. Preserve the file's existing import grouping and ordering convention — the external `@liquid-labs/*` block is alphabetised and separated by a blank line from the relative `./constants` import; `crossLinkDevProjects` moves out of the external block and joins the relative block. The call site at line 90 does not change at all.

4. **Port the test and its fixture.** `liq-projects-lib` ships the only test coverage this function has ever had, and liq-work would otherwise inherit an untested 56-line function that shells out to `yalc`. Bring across:

   | From (`liq-projects-lib`) | To (`liq-work`) |
   |---|---|
   | `src/test/cross-link-dev-projects.test.js` | `src/handlers/work/_lib/test/cross-link-dev-projects.test.js` |
   | `src/test/data/orgA/proj1/package.json` | `src/handlers/work/_lib/test/data/cross-link/orgA/proj1/package.json` |

   Adjust only what the move forces: the import specifier becomes `../cross-link-dev-projects`, and the fixture path in the test becomes `fsPath.join(__dirname, 'data', 'cross-link', 'orgA', 'proj1')`. The test's single case, its `appMock`, its `dryRun: true`, and its `expect(links).toHaveLength(0)` all stay as they are.

   **Use the `data/cross-link/` sub-path, not `data/orgA/`.** liq-work already has a `test/data/playground/orgA/proj1` fixture with different content and different requirements; putting two different `orgA/proj1` fixtures side by side under one `data/` directory is a trap for whoever reads this next. Do **not** port `src/test/data/orgA/proj1/subdir/foo.txt` — it exists for `liq-projects-lib`'s `update-package-json.test.js` (a `findRoot` fixture), which is not moving.

   This fixture is ordinary tracked content in `liq-projects-lib` (`100644`), so it ports as plain files with none of the gitlink trouble phase 7 task 001 deals with. It needs no git repository and no runtime initialiser.

5. **Remove the dependency.** Delete `"@liquid-labs/liq-projects-lib": "^1.0.0-alpha.12"` from `package.json` `dependencies` and refresh `package-lock.json` with `npm install`. Change nothing else in either file — no version bump (that is task 9-003), no other dependency edit, no `terminal-text`/`octokit` cleanup (recorded as follow-ups, deliberately not done here).

   Confirm the two dependencies the inlined function actually needs are already declared and stay untouched: `@liquid-labs/federated-json ^1.0.0-alpha.33` and `@liquid-labs/shell-toolkit ^1.0.0-alpha.3`. The inlining is **dependency-neutral**: it adds nothing and removes one.

6. **Touch `liq-projects-lib` not at all.** Read it, copy from it, and leave it exactly as you found it. Its deletion of the now-orphaned function, its own retirement, and the fate of `determineCurrentMilestone` (single consumer: `liq-integrations-issues-github`, under the sibling `core-server-domain-consolidation` plan-group) and of `updatePackageJSON` (**zero** consumers anywhere — dead) all belong to that package's own slice. Say in the report that this task has landed, so that slice knows its gate is open.

## Validation

- **The dependency is gone and nothing imports it.** `grep -rn "liq-projects-lib" src/` returns nothing. `grep -n "liq-projects-lib" package.json` returns nothing. `npm ls @liquid-labs/liq-projects-lib` reports it absent from the tree (a transitive appearance via some other package would be a finding to report, not to act on).
- **The function is byte-identical to its origin, modulo the file header.** `diff /Users/zane/playground/liquid-labs/liq-projects-lib/src/cross-link-dev-projects.mjs src/handlers/work/_lib/cross-link-dev-projects.mjs` reports **no differences**, or reports only the minimal lint-forced change requirement 2 permits — in which case paste the diff into the report. Phase 9 task 001 runs this same comparison as a gate.
- **The new test passes.** `make test` reports **3 total suites** (`determine-projects`, `work-db`, `cross-link-dev-projects`) with `cross-link-dev-projects.test.js` **passing** its single case. Note that this suite loads only `federated-json` and `shell-toolkit`, so — unlike `work-db.test.js` — it is unaffected by the `SlowBuffer` defect.
- **The known failure set is unchanged.** `make test` reports `Test Suites: 1 failed, 2 passed, 3 total` — the same single failure as before, `work-db.test.js`'s `TypeError: Cannot read properties of undefined (reading 'prototype')`, now alongside two passing suites instead of one. This holds whichever order this task and phase 7 task 001 merge in, since 001 changes no counts. **Any second failing suite is a regression from this task.** Record the exact summary line.
- **`work-db.mjs`'s diff is one line.** `git diff src/handlers/work/_lib/work-db.mjs` shows exactly one changed import line (plus, at most, its relocation between import blocks). The call site at line 90 is untouched. No other executable line differs.
- **Build and lint stay green.** `make build` produces `dist/liq-work.js`, and — this is the real proof the inlining is complete — the bundle no longer contains any reference to `liq-projects-lib`: `grep -c "liq-projects-lib" dist/liq-work.js` returns 0. `make lint` is clean, including both new files.
- **The bundled function is present, not merely the source.** Confirm `crossLinkDevProjects`'s body is in `dist/liq-work.js` (grep for its distinctive `Was asked to cross-link` error string). Before this task the function was an external import resolved at runtime; after it, it is bundled, and a Rollup externals misconfiguration that silently dropped it would otherwise go unnoticed until runtime.
- **The plugin contract is unchanged.** Load the bundle with the `SlowBuffer` preload shim (see `## Assumptions`) and assert `handlers.length === 30`, `typeof setup === 'function'`, and that the 30 `path` arrays are identical to the pre-task list. Write both lists to files and `diff` them.
- **`liq-projects-lib` is untouched.** `git status --porcelain` in `/Users/zane/playground/liquid-labs/liq-projects-lib` is clean, and no commit or branch was created there.

## Metadata

architectural_impact: true

## Assumptions

- **A `SlowBuffer` preload shim is required to load `dist/liq-work.js` at all** on this environment's Node v26.5.0. Write it to a scratch path outside the repository and use `node --require <shim> -e "…"`:

  ```js
  const buffer = require('node:buffer')
  if (buffer.SlowBuffer === undefined) {
    buffer.SlowBuffer = function SlowBuffer (n) { return Buffer.allocUnsafeSlow(n) }
    buffer.SlowBuffer.prototype = Object.create(Buffer.prototype)
  }
  ```

  It is a **measurement aid only**. Never commit it, never add it to `src/`, never reference it from `package.json` or the `Makefile`. The underlying defect is pre-existing, environment-wide, and flagged to the manager; see the source inventory's W5/D1.
- **`crossLinkDevProjects` reads `app.ext._liqProjects.playgroundMonitor.getProjectData(...)`** — a D7-frozen key that liq-work already reads in eleven other modules. Inlining changes nothing about that coupling, and must not add a guard for it.
- **Both packages are `UNLICENSED` with the same author**, so there is no attribution or licence header to carry across.
- The function is currently reached through `liq-projects-lib`'s built `dist/`, which resolves `1.0.0-alpha.13` in `node_modules` while `package.json` declares `^1.0.0-alpha.12`. Copy from **`liq-projects-lib`'s `src/`**, not from `node_modules`' bundled `dist/`, and note in the report if the two differ in substance (they should not).
- This task is **parallel-eligible with phase 7 task 001** — the two touch disjoint files — but both land in `liq-work`, so they need separate task worktrees and a merge order. If 001 has already merged, the suite-count expectations above hold as written; if this task merges first, 001's expectations shift by this suite and 001's agent should say so.
- This task does **not** need `liq-projects` phase 1, dev-core, or any other slice.

## References

- `plan/notes/liq-work-source-inventory.md` — section **W4** for the full verification of the single-consumer claim, the dependency-neutrality table, and the sibling-function findings; **W3** for why no dependency is added.
- `/Users/zane/playground/liquid-labs/liq-projects-lib/src/cross-link-dev-projects.mjs` — the source to copy.
- `/Users/zane/playground/liquid-labs/liq-projects-lib/src/test/cross-link-dev-projects.test.js` and `src/test/data/orgA/proj1/package.json` — the test and fixture to port.
- `/Users/zane/playground/liquid-labs/liq-work/src/handlers/work/_lib/work-db.mjs` — lines 13 (import) and 90 (call site).
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — **D11**, which fences `liq-projects-lib` out of the liq-projects slice and names this work as liq-work's.

## Checkpoint hints

- After requirement 1's re-verification, with the three grep results recorded and before any file is created.
- After the function is copied and `work-db.mjs`'s import is rewritten, with the `diff` against the origin clean and `make build` green.
- After the test and fixture are ported and `make test` shows 3 suites with the known single failure.
- After the dependency removal and `npm install`, with the `grep -c "liq-projects-lib" dist/liq-work.js` → 0 check and the 30-route parity diff recorded.
