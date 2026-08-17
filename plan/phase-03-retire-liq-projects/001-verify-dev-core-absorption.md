# Verify Dev-Core Absorption

## Purpose and scope

**Read-only gate task.** Runs from the `liq-projects` task worktree and **reads** the `sdlcforge/dev-core` checkout (`/Users/zane/playground/sdlcforge/dev-core`). It edits nothing in either repository except its own task document's status notes.

Confirm, with file-and-line evidence, that `@sdlcforge/dev-core` really carries everything `@liquid-labs/liq-projects` had, before this plan takes the one-way step of publicly labelling liq-projects superseded and deprecated. Marking a package deprecated is an irreversible public statement; a cheap read-only verification first is the whole reason this task exists, and it is the same gate the completed sibling retirement of `@liquid-labs/liq-integrations` used.

**Halt the phase** if any check fails. Do not repair the gap here — report it so the manager can dispatch a fix against phase 2 instead.

## Requirements

Verify each of the following against the dev-core working tree, recording the evidence (path, and line or command output) for each:

1. **Module census.** Every module liq-projects had is present under dev-core's `src/projects/`: `setup.mjs`, `index.mjs`, `handlers/index.js`, the 17 top-level handler modules (including `document.js`), the 2 handlers plus `index.js` under `handlers/releases/`, the 14 `handlers/_lib/` modules, the 3 `handlers/releases/_lib/` modules, the 9 files under `handlers/test/` (6 `.test.mjs`, the misnamed `close-implied.mjs`, and the 2 `test/lib/` helpers), and `handlers/_lib/test/`'s 2 test files plus 7 data fixtures — 58 files in total, the 59 liq-projects tracked under `src/` minus its root `index.js`. Produce the comparison mechanically: list liq-projects's own `git ls-files src` (post-restructure) and dev-core's `git ls-files src/projects`, map through the known path transformation, and diff.
2. **Route parity — all 19.** From dev-core's built bundle, enumerate `handlers` and their `path`/`paths` values, and confirm the set matches liq-projects's 19 exactly: the 10 operations (create, setup, detail, rename, update, document, close, archive, destroy, releases/publish) in both explicit and implied forms where liq-projects had both (create is explicit-only).
3. **Setup wiring and ordering.** dev-core's `src/index.mjs` registers the `projects` submodule's `setup` **first**, and running the composite `setup` against a stub `app` produces `app.ext._liqProjects` with both `playgroundMonitor` and `playgroundPath`, and calls `setupCredentials` from `@liquid-labs/credentials-db-plugin-github`. Confirm the `app.ext` key is spelled exactly `_liqProjects`, and that `registerPathVar` is called for both `projectName` and `newProjectName`.
4. **Dependency completeness.** All 16 of liq-projects's runtime dependencies are present in dev-core's `package.json` at ranges no lower than liq-projects's, and `npm ls --depth=0` in dev-core resolves cleanly.
5. **dev-core is green.** `make build` produces `dist/dev-core.js`; `make test` passes with the liq-projects suite set present (the 8 suites, plus the phase 1 smoke suite); `make lint` and `make qa` pass. Record the observed counts. Treat a live-GitHub credential/network failure of the `project-lifecycle` suite as an environment condition — note it explicitly rather than passing it off silently or calling it a gap.
6. **History preserved.** `git log --follow` inside dev-core on at least three relocated files (`src/projects/setup.mjs`, one handler, one `_lib` module) reaches pre-plan liq-projects commits.
7. **Consumer handoff exists.** `docs/consumer-migration.md` and `docs/dev-core-consolidation-contract.md` are both present in dev-core.
8. **Nothing of liq-projects's identity leaked.** dev-core's `package.json` `name` is `@sdlcforge/dev-core`; no file under dev-core `src/` references `@liquid-labs/liq-projects`; no `.catalyst-data.yaml`, `src/index.js`, or `make/50-liq-projects-js.mk` is tracked in dev-core.

Write the findings into this task document's status notes as an explicit pass/fail line per requirement, each with its evidence. A bare "verified" is not an acceptable record.

## Validation

- Both working trees are unchanged at the end of the task: `git -C /Users/zane/playground/sdlcforge/dev-core status --short` and `git status --short` in the liq-projects worktree show no modifications other than this task document.
- All eight requirement groups have a recorded pass/fail with concrete evidence (a path plus a line number, a command plus its output, or a diff that came back empty).
- The route-parity check is a mechanical diff of two enumerated lists, not an assertion of equality by inspection.
- If any check fails, the task halts and reports the specific gap with the evidence, and the report states unambiguously that tasks 002–004 must not proceed.

## Assumptions

- Phase 2 has fully landed and merged in both repositories.
- `node_modules` is installed in the dev-core checkout, or can be installed there; installing is acceptable even though this is a read-only task, since `node_modules` is gitignored — but say so in the report if you do it.
- liq-projects's post-restructure file census and 19-handler count are recorded in phase 2's task documents; if they are missing, derive them from liq-projects's own working tree, which still carries the restructured code.

## References

- `plan/notes/liq-projects-source-inventory.md` — the file census, route table, dependency list, and baseline this task verifies against.
- `plan/notes/dev-core-target-shape.md` — decisions D6 (setup ordering), D7 (`app.ext` freeze), D10 (why verification precedes deprecation).
- `/Users/zane/playground/liquid-labs/liq-integrations/plan/plan-summary-framework-consolidation.md` — the sibling retirement's `001-verify-fold-in-completeness` gate, whose shape this task follows.

## Checkpoint hints

- After the module census and route-parity diffs are complete and recorded.
- After the setup-wiring, dependency, and green-build checks are recorded.
- After the history-preservation and identity-leak checks complete the record.
