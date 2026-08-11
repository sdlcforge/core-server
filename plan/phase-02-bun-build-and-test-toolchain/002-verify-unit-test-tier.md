# Verify Unit Test Tier

## Purpose and scope

Prove that the Jest unit tier passes unchanged against a Bun-installed `node_modules`, that the golden-api-spec snapshots are byte-for-byte identical, and that coverage still lands in `qa/coverage/` in the Istanbul directory shape its downstream consumer expects — then record the decision that Jest stays and a `bun test` migration is out of scope.

Scope excludes the build and lint tiers (task 001 owns them), the integration tiers (phase 3), and documentation (phase 4). Like task 001, this is a verification-and-record task whose success condition includes **modifying no `make/*.mk` file** and no test source.

No standard skill covers this; follow the procedure below.

## Requirements

1. **Run `make test` against a Bun-installed tree** and confirm the full pipeline:
   - The Babel `test-staging` transpile step runs and populates `test-staging/` from `src/`.
   - `NODE_OPTIONS=--experimental-vm-modules npx jest --config=… --runInBand` runs from inside `test-staging/`.
   - 3 test suites pass, 5 tests pass.
   - `qa/unit-test.txt` and `qa/.unit-test.passed` are produced.

2. **Verify the golden snapshots are unmodified.** `test/__snapshots__/golden-api-spec.json` and `test/__snapshots__/golden-plugins-list.json` must show no change in `git status` after the run. Do not set `UPDATE_GOLDEN_API_SPEC`; regeneration is an explicit opt-in and is not wanted here. If either snapshot would change, that is a real API-surface regression from phase 1 — halt and report rather than regenerating.

3. **Verify the coverage artifact shape.** `qa/coverage/` must carry the Istanbul directory output the existing `coverageReporters: ['json', 'text', 'html', 'clover']` config produces — `index.html`, `coverage-final.json`, `clover.xml`, and per-file HTML pages — copied from `test-staging/coverage/` by `make/55-test.mk`'s final step. This shape matters beyond aesthetics: `@liquid-labs/sdlc-projects-badges-coverage` is itself one of this project's dependencies and consumes coverage output.

4. **Record the runner decision.** State in the task report, for phase 4 to consume:
   - **Jest stays, running under Node.** This is the status quo and requires no change.
   - **Jest must not be run under the Bun runtime.** `bunx --bun jest` fails outright for every suite with `TypeError: Attempted to assign to readonly property` from `jest-runtime`'s module sandboxing — a structural incompatibility between Jest and Bun's JavaScriptCore module system, not a config problem. Note that `bunx jest` *without* `--bun` succeeds, because it honors Jest's `#!/usr/bin/env node` shebang and runs under Node; that success is not evidence of Bun-runtime compatibility and must not be reported as such.
   - **A `bun test` migration is viable but out of scope**, with its three costs: mandatory explicit path scoping (bare `bun test` discovers both `src/lib/test/` and `test-staging/lib/test/` and produces a real cross-contamination failure), a coverage-output change from the Istanbul directory to a single `lcov.info` requiring the `make/55-test.mk` copy step and the badges-coverage consumer to be reworked, and a design decision on whether to keep the Babel `test-staging` step.
   - **`NODE_OPTIONS=--experimental-vm-modules` is not currently load-bearing** for this suite — it was tested both ways and both pass — but it stays. Removing it is out of scope and may matter for import patterns the current three test files do not exercise.

5. **Surface the latent test-isolation fragility as a followup**, do not fix it. `src/lib/test/app-init.test.js` sets `process.env.COMPLY_HOME` directly in `beforeAll`, a process-wide mutation currently masked by Jest's per-file worker isolation. It caused a real failure when two copies of the test tree were discovered together. It is a pre-existing fragility, unrelated to the Bun conversion, and fixing it here would perturb the very baseline this task is verifying.

6. **If `make test` fails**, halt and report the failure verbatim. Do not modify test sources, the Jest config, or `make/55-test.mk`.

## Validation

- `make test` exits 0, reporting 3 passed suites and 5 passed tests.
- `git status --porcelain test/__snapshots__/` is empty.
- `qa/unit-test.txt` exists and begins with a `Test git rev:` line; `qa/.unit-test.passed` exists.
- `qa/coverage/index.html`, `qa/coverage/coverage-final.json`, and `qa/coverage/clover.xml` all exist.
- `git status` shows no modification to any file under `make/`, `src/`, or `test/`.
- The report records the observed suite/test counts, the coverage percentage, and the four decision statements from requirement 4.

## Assumptions

- Phase 1 has landed in full, and this task's worktree has `.yalc/` provisioned before `bun install` — use `scripts/provision-local-deps.sh`.
- This task and task 001 are independent and may run concurrently; neither modifies a file the other reads.
- Jest runs under Node throughout. Node remains a toolchain prerequisite of this project and is not being removed.
- The golden snapshots on `main` are the correct baseline; phase 1 should not have moved them, and both unit tests pass `serverConfigRoot` explicitly so phase 1 task 004's config-root change should not reach them.

## References

- [Catalyst toolchain compatibility under Bun](../notes/catalyst-bun-compatibility.md) — Q3 (Jest under Bun) and Q4 (the `bun test` migration delta, the discovery hazard, and the coverage-shape change) are the findings this task re-verifies and records.
- `src/lib/test/golden-api-spec.test.js` — the characterization test and its documented `__dirname` traversal, which the research confirmed needs no rework.

## Checkpoint hints

- After `make test` passes and the snapshot check is clean.
- After the coverage-artifact shape is verified.
