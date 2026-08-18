# Phase 7 — liq-work Pre-Migration Remediation

## Purpose and scope

Phase summary for the first phase of the `dev-core-consolidation` plan-group's `liq-work` slice. **Both tasks execute in `liq-work`** (`/Users/zane/playground/liquid-labs/liq-work`). Neither depends on any other slice, on `sdlcforge/dev-core`, or on the other — **this phase is unblocked today.**

## Goals

Fix two things in `liq-work` that must be true *before* any relocation, and that leave the standalone package strictly better whether or not the consolidation ever happens.

**One is a hard prerequisite for the migration.** `src/handlers/work/_lib/test/data/playground/orgA/proj1` is tracked as a mode-`160000` gitlink with **no `.gitmodules` entry**; its real content — a `package.json` and a nested `.git/` on branch `orgA/proj1/1` — exists only in one 2023-vintage working tree. This was proved, not inferred: a fresh `git clone` of liq-work yields an **empty** fixture directory, and a rehearsed `git merge --allow-unrelated-histories` into a clone of dev-core carries the gitlink across and materialises the same empty directory. `determine-projects.test.js`, the one suite that passes today, therefore cannot survive absorption — and its failure mode is worse than a clean break: a fixture directory with no `.git` inside a checkout makes `git branch` resolve against the **enclosing** repository, so the test can "pass" for entirely the wrong reason. Task 001 replaces the gitlink with tracked content plus a runtime fixture-repo initialiser under `test-staging/`, which is gitignored and rebuilt on every `make test`.

**The other is the plan-group's designated special scope item.** `crossLinkDevProjects` is the one piece of `@liquid-labs/liq-projects-lib` that dev-core actually needs, and `liq-work` is its sole consumer anywhere. Task 002 moves it verbatim into `liq-work`'s own `_lib/`, ports its test, and removes the `liq-projects-lib` dependency.

Doing the inlining **here, before the relocation** rather than later in dev-core buys three things: phase 8 task 001 stays a near-pure `git mv`; phase 8 task 002's dependency union never has to consider `liq-projects-lib` at all; and `liq-projects-lib`'s own retirement slice — planned fifth, and gated on `crossLinkDevProjects` having a new home — is unblocked the moment task 002 lands, independently of when dev-core's phase 1 lands.

Both tasks are deliberately kept out of the restructure task so that phase 8 task 001's diff remains reviewable as "files moved, one line changed."

## Inputs

- `liq-work` at its current `main` (`cc3e67f`), with a clean working tree apart from untracked `.flow/`, `worktrees/`, `.yalc/`, build outputs, and a stray `jsdoc-config.json~`. **Unlike the `liq-orgs` slice, there is no dirty-working-tree decision to make first.**
- The **measured** baseline, taken by running the toolchain rather than reading the stale gitignored `qa/unit-test.txt`: `make build` passes (`dist/liq-work.js`, 81 KB); `make lint` passes clean; `make test` **fails** at 1 failed / 1 passed suite, 6 tests passing. The single failure is `work-db.test.js`, which cannot load on Node ≥ 24 because `buffer-equal-constant-time` dereferences the removed `SlowBuffer` — pre-existing, environment-wide (it also breaks 5 of `liq-projects`'s 8 suites), and out of scope under D11.
- The gitlink evidence and both rehearsals (fresh clone, unrelated-histories merge), plus the `determineCurrentBranch` implementation that explains why the fixture must be a real git repo with at least one commit — all in `plan/notes/liq-work-source-inventory.md`, sections **W5/D2** and **W5/D1**.
- `@liquid-labs/liq-projects-lib` as read-only input: `src/cross-link-dev-projects.mjs` (the function to move, 56 lines), `src/test/cross-link-dev-projects.test.js` and `src/test/data/orgA/proj1/package.json` (the test and fixture to port). Its `determineCurrentMilestone` (single consumer: `liq-integrations-issues-github`, a different plan-group) and `updatePackageJSON` (**zero** consumers — dead) are explicitly out of scope.
- The verified single-consumer evidence in **W4**: `crossLinkDevProjects` is imported at exactly one place (`src/handlers/work/_lib/work-db.mjs:13`), called at exactly one place (line 90), is liq-work's only use of `liq-projects-lib`, and has no other consumer playground-wide. Its three imports — `node:path`, `federated-json`, `shell-toolkit` — are all already declared, so the inlining is **dependency-neutral**.

## Outputs

- In `liq-work`: the gitlink gone (`git ls-files -s src | grep '^160000'` empty), `…/playground/orgA/proj1/package.json` tracked as ordinary content, and an idempotent runtime initialiser that builds the fixture repository on branch `orgA/proj1/1` inside `test-staging/` — with a positive assertion that the fixture *is* the fixture, so the silent-wrong-answer failure mode cannot recur. Demonstrated by running the suite from a fresh clone.
- In `liq-work`: `src/handlers/work/_lib/cross-link-dev-projects.mjs` byte-identical to its origin; `src/handlers/work/_lib/test/cross-link-dev-projects.test.js` with its fixture at `test/data/cross-link/orgA/proj1/package.json` (a distinct sub-path, so it cannot be confused with the pre-existing `test/data/playground/orgA/proj1`); one rewritten import line in `work-db.mjs`; `@liquid-labs/liq-projects-lib` removed from `package.json` and `package-lock.json`; and `grep -c "liq-projects-lib" dist/liq-work.js` returning 0.
- A `liq-work` that builds, lints clean, keeps its 30-route plugin contract byte-identical, runs 3 test suites of which the **only** failure is the known `SlowBuffer` one, and whose test fixtures are reproducible from a fresh clone.
- An unblocked gate for the `liq-projects-lib` retirement slice, reported explicitly so that slice knows it may proceed.
