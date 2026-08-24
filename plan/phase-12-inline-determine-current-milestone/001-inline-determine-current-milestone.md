# Inline Determine Current Milestone

## Purpose and scope

Copy `determineCurrentMilestone`'s implementation out of `@liquid-labs/liq-projects-lib` and into this repository's own source, repoint `src/create-or-update-pull-request.mjs` at the local copy, and remove `@liquid-labs/liq-projects-lib` from `package.json` `dependencies` entirely. PR-creation behavior — specifically milestone assignment — must be bit-for-bit unchanged; this is a relocation of an implementation, not a rewrite of one.

**Why this matters beyond this repository.** This import is the last live source-level dependency on `@liquid-labs/liq-projects-lib` in the playground, and the separate `dev-core-consolidation` plan-group's final remaining task (`liq-projects-lib`'s own phase 10 task 003, the npm deprecate) is blocked on it — a package cannot be safely deprecated while something still depends on it. Landing **this task** is what unblocks that closeout. It is standalone: it depends on nothing else in this plan, gates nothing outside its own phase's task 002, and should be merged to `main` as soon as it is green rather than held for the relocate/retire phases.

Read [`plan/notes/liq-integrations-issues-github-source-inventory.md`](../notes/liq-integrations-issues-github-source-inventory.md) first — its dependency-inventory and `determineCurrentMilestone` sections are the ground truth this task's requirements rest on.

## Requirements

1. **Start from a clean, baselined tree.** Confirm `git status` is clean in this task's worktree. Record the pre-change baselines this task's validation compares against: the `make test` test count and pass/fail state, `make lint` output, and the built `dist/liq-integrations-issues-github.js`.

2. **Create `src/determine-current-milestone.mjs` carrying the function verbatim.** The source of truth is `/Users/zane/playground/liquid-labs/liq-projects-lib/src/determine-current-milestone.mjs`. Read that file at execution time rather than copying the excerpt in the source inventory — the excerpt is a plan-authoring-time snapshot, the file is authoritative. The new file's content is the whole of that file: both imports (`Octocache` from `@liquid-labs/octocache`, `minVersion` from `@liquid-labs/versioning`), the `determineCurrentMilestone` const, and the `export { determineCurrentMilestone }`.

   The filename follows this repository's existing one-file-per-function, kebab-case-matching-the-export convention (`get-issue-url.mjs` → `getIssueURL`), and places the file where Phase 13's whole-subtree `git mv` will carry it without special handling.

   **Do not "improve" the function while copying it.** Two things about it invite cleanup and must be left exactly as they are:
   - The destructured `cache` parameter is never used in the body. Keep the parameter — its caller passes `cache`, and dropping it from the signature is a signature change.
   - The function constructs its own `Octocache` from the `GITHUB_API` token even though its only caller, `createPR`, already holds one it could pass in. Keep the second construction. Reusing the caller's instance is a real behavior change (different cache instance, different request-coalescing behavior) dressed up as a tidy-up.

   Both are recorded as anomaly 3 in the source inventory. If either looks worth changing, record it as a follow-up for after the fold lands and say so in the report — do not act on it here.

3. **Repoint the import in `src/create-or-update-pull-request.mjs`.** Replace

   ```javascript
   import { determineCurrentMilestone } from '@liquid-labs/liq-projects-lib'
   ```

   with a relative import of the new module, placed to keep the file's import block ordered the way ESLint expects (the existing block is alphabetized by specifier with the bare-package imports ahead of the relative `./constants` import; put the new relative import with the relative ones and let `make lint` arbitrate). **The call site at line 126 does not change** — `determineCurrentMilestone({ app, cache, gitHubOrg, projectBasename })` keeps the same four arguments in the same shape.

4. **Fix the dependency set in `package.json`, all three changes together.**
   - **Remove** `@liquid-labs/liq-projects-lib`. After requirement 3 nothing in `src/` imports it; confirm that with a grep rather than assuming.
   - **Add** `@liquid-labs/versioning`. This is not optional and not tidy-up: `minVersion` comes from it, and `@liquid-labs/liq-projects-lib` is its **only** provider in the current dependency graph. Removing `liq-projects-lib` without adding `versioning` leaves the inlined function importing a package nothing declares. Declare the range `^1.0.0-alpha.4` — the range `liq-projects-lib` itself declares, which the installed `1.0.0-alpha.6` satisfies, so today's resolution is preserved exactly. If the installed tree disagrees with that reasoning, resolve the correct range from the installed tree instead and state the choice and why in the report.
   - **Add** `@liquid-labs/octocache` at the range matching the installed version (`^1.0.0-alpha.4`). It has always been imported by `create-or-update-pull-request.mjs` and declared by nothing (anomaly 1), resolving transitively; the inlined function adds a second import of it. It still resolves after this change (`@liquid-labs/github-toolkit` declares it too), so this is not a break-fix — it is closing a real undeclared-transitive hazard in the file this task is already editing. `core-server`'s absorb task handles the same hazard independently on its side; that does not make declaring it here redundant.

   Change nothing else in `package.json` — not `version`, not `description`, not `scripts`, not `devDependencies`.

5. **Reinstall and confirm the graph actually resolves.** Run the project's install so `package-lock.json` reflects the new dependency set, then confirm `@liquid-labs/versioning` and `@liquid-labs/octocache` resolve and `@liquid-labs/liq-projects-lib` is genuinely gone from the resolved tree (or, if it survives as someone else's transitive dependency, say so — that is fine and expected to be reported, not fixed).

6. **Add unit coverage for the inlined function — after the above is green, not before.** There is **no test to port**: `liq-projects-lib`'s own `src/test/` covers `crossLinkDevProjects` and `updatePackageJSON` only, nothing exercises `determineCurrentMilestone`. Confirm that yourself rather than taking it on faith, and state the finding in the report either way.

   Then add `src/test/determine-current-milestone.test.js` alongside the existing `src/test/uses-github-issues.test.js`, mocking `@liquid-labs/octocache` so no network call is made, and covering at minimum:
   - Given milestones whose titles are versions, the returned value is the `number` of the milestone whose title is the minimum version.
   - Non-version milestone titles are ignored (the call passes `ignoreNonVersions: true`).
   - When no milestone title matches the computed minimum, the function returns `undefined` rather than throwing — the optional-chained `?.number` behavior.

   The token comes from a stub `app.ext.credentialsDB.getToken`; assert it is asked for `'GITHUB_API'`.

   If the shared `@liquid-labs/catalyst-scripts-node-project` Jest/Babel pipeline blocks module mocking after a genuine attempt, **do not restructure the source to make it testable** — that would violate requirement 2. Land requirements 1–5 and 7 green, record the exact blocker and diagnostic in the report, and leave the coverage as a flagged follow-up.

7. **Verify PR milestone behavior is unchanged.** Beyond the build/test/lint gates, reason explicitly about the call path and confirm in the report: `createPR` still races `determineCurrentMilestone` against the repo-metadata request via `Promise.all`, still hands the resolved `milestone` to the `PATCH /repos/{owner}/{repo}/issues/{issueNumber}` call, and that `PATCH` is still inside the `try`/`catch` that reports non-critical failures through `reporter` and returns the PR URL anyway. No live GitHub call is required or wanted for this check.

8. **Report which branch(es) carry the result.** `core-server`'s absorb task verifies and merges this donor's `plan/core-server-domain-consolidation` branch, not `main` (anomaly 5), and its own requirement 6 branches on whether it finds the inlining done or not. State plainly where this change lands so the dispatching manager can reconcile branch reachability before `core-server`'s absorb task is dispatched. Do not perform branch surgery on any protected or plan branch — halt and report instead.

9. **Do not touch anything else.** No relocation of `src/` (that is Phase 13), no `README.md`, no `docs/`, no `AGENTS.md` (Phase 12 task 002 owns the doc corrections), no `Makefile`, no changes to any other hook.

## Validation

- `src/determine-current-milestone.mjs` exists and its function body is byte-identical to `liq-projects-lib`'s `src/determine-current-milestone.mjs` — verify with an actual diff of the two files, not by eye. The `cache` parameter is still in the signature and the internal `new Octocache({ authToken })` is still there.
- `grep -rn 'liq-projects-lib' src/ package.json` returns nothing.
- `src/create-or-update-pull-request.mjs`'s call site is unchanged: `determineCurrentMilestone({ app, cache, gitHubOrg, projectBasename })`, still assigned to `milestonePromise`, still inside the `Promise.all` with `repoPromise`. `git diff` on that file shows exactly one changed line — the import.
- `package.json` `dependencies` no longer lists `@liquid-labs/liq-projects-lib` and now lists both `@liquid-labs/versioning` and `@liquid-labs/octocache`. `git diff package.json` shows only `dependencies` entries changed — no `version`, `description`, `scripts`, or `devDependencies` movement.
- `make build` succeeds and produces `dist/liq-integrations-issues-github.js`. Compare against the pre-change bundle: the added `determineCurrentMilestone` implementation is an expected difference; the exported `setup` surface must be unchanged. Confirm `@liquid-labs/versioning` and `@liquid-labs/octocache` appear as external `require`s in the bundle rather than being inlined into it — the same externality property `core-server`'s own bundle audit checks for.
- `make test` passes. Test count is the pre-change baseline plus whatever requirement 6 added; no pre-existing test newly fails.
- `make lint` passes clean, including import ordering in the edited file.
- The report states: whether `liq-projects-lib` had any test coverage for this function (expected: none); the `@liquid-labs/versioning` range chosen and why; whether requirement 6's test landed or was blocked, with the blocker if so; the requirement 7 call-path confirmation; and the branch(es) carrying the change.
- No file outside `src/determine-current-milestone.mjs`, `src/create-or-update-pull-request.mjs`, `src/test/determine-current-milestone.test.js`, `package.json`, and `package-lock.json` is modified.

## Assumptions

- `@liquid-labs/versioning` is a live, separately-maintained package and is **not** being retired by this wave. `minVersion` is imported from it, not inlined a second level down. Confirm it is not itself carrying a deprecation notice before relying on this; if it is, halt and report rather than choosing a workaround.
- `@liquid-labs/octocache` continues to resolve after `@liquid-labs/liq-projects-lib` is dropped, because `@liquid-labs/github-toolkit` also declares it. Requirement 5's reinstall is what actually confirms this.
- The `dev-core-consolidation` plan-group's `liq-projects-lib` phase 10 task 003 is a *different project's* task. This task does not run it, dispatch it, or edit anything in `liq-projects-lib`; it only removes the blocker.

## References

- [`plan/notes/liq-integrations-issues-github-source-inventory.md`](../notes/liq-integrations-issues-github-source-inventory.md) — dependency inventory (declared, undeclared, and newly-required), the `determineCurrentMilestone` analysis and call-path description, and anomalies 1, 2, 3, and 5.
- `/Users/zane/playground/liquid-labs/liq-projects-lib/src/determine-current-milestone.mjs` — the implementation being copied; authoritative over any excerpt.
- [`core-server`'s absorb task for this donor](/Users/zane/playground/sdlcforge/core-server/worktrees/plan/core-server-domain-consolidation/plan/phase-05-absorb-donor-plugins/003-absorb-liq-integrations-issues-github.md) — its requirement 6 explicitly handles both possible states of this inlining, so no timing coordination with it is needed; its requirement 5 covers the `octocache` hazard on `core-server`'s side.

## Checkpoint hints

- After `src/determine-current-milestone.mjs` is created and diffed against its source, before the import repoint.
- After the import repoint and the `package.json` dependency changes, with `make build` green.
- After the reinstall and `make test`/`make lint` are green — this is the point at which the `liq-projects-lib` blocker is removed.
- After the new unit test lands (or its blocker is recorded).
