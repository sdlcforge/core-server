# Absorb Liq-Integrations-Issues-Github

## Purpose and scope

Bring `@liquid-labs/liq-integrations-issues-github`' source into `core-server`'s own tree at `src/integrations-issues-github/` by history-preserving merge, wire it through the `builtinPlugins` aggregator, and remove it from the Tier-2 explicit npm-dependency list — all in one landing.

This donor is different from the other two in a way that shapes every check in this task: **it contributes zero HTTP routes.** Its entire surface is two integration-provider registrations carrying seven hooks. Nothing in a route snapshot can tell you whether this absorption worked. The verification for this donor lives entirely in Phase 3 task 002's `register()`-call baseline.

It also carries the plan's one named packaging hazard: `@liquid-labs/octocache`, imported by the donor and declared by nothing, which `nodeExternals()` will silently inline into `dist/sdlcforge-server.js` unless it is explicitly declared.

**Cross-project gate.** Do not dispatch until this donor's own relocation has landed on its `plan/core-server-domain-consolidation` branch. As of this plan's authoring it has a plan branch but **no authored plan**; its source roots directly at `src/`, so its relocation is a `git mv` of everything under `src/` into `src/integrations-issues-github/`, with a thin root `src/index.js` re-export.

## Requirements

1. **Verify, then merge.** `git ls-tree -r --name-only <donor-remote>/plan/core-server-domain-consolidation -- src` must already show `src/integrations-issues-github/…`. Record `core-server`'s pre-merge commit SHA. Merge the donor's **plan branch, not `main`**, with `--allow-unrelated-histories`.

2. **`src/index.js`, again.** If task 002 did its job, `core-server` has no `src/index.js` and this donor's arrives as another clean, silent add — remove it (`git rm src/index.js`). If task 002 missed it, this merge produces an add/add conflict on that path: that conflict *is* the signal, and the resolution is to remove the path outright rather than choose a side. Either way `core-server` ends with no `src/index.js`.

3. **Drop every donor package-level file** per the standing list (`package.json`, `package-lock.json`, `bun.lock`, `Makefile`, `make/`, `.gitignore`, `.eslintrc*`, `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/` including the donor's own `*-spec.md`, `dist/`, `qa/`, `test-staging/`, `node_modules/`, and every arriving path under `plan/`, scoped to the arriving paths).

4. **Verify by blob comparison.** `git diff --stat <pre-merge-commit> -- . ':(exclude)src/integrations-issues-github'` must show nothing outside the new directory that this task did not deliberately change.

5. **Declare `@liquid-labs/octocache` explicitly.** It is imported by the donor and declared by nothing, resolving transitively today. `nodeExternals()` decides externality from `package.json`, so an undeclared bare specifier is not externalized: `resolve()` finds it in `node_modules` and Rollup quietly inlines it. The build stays green, `dist/` grows, and the artifact breaks only for a registry consumer whose transitive graph differs. Resolve its correct range from the installed tree and add it to `dependencies`.

6. **Re-check the `determineCurrentMilestone` coupling — do not assume either way.** `create-or-update-pull-request.mjs` imports `determineCurrentMilestone` from `@liquid-labs/liq-projects-lib`; a task in this donor's own plan slice inlines it. Absorb whatever the donor's source **actually is** at merge time. `@liquid-labs/liq-projects-lib` enters the dependency union **only if** the inlining has not landed. Report which state was found — `dev-core-consolidation`'s own last remaining task (`liq-projects-lib` phase 10 task 003) is waiting on this inlining, so the finding matters beyond this plan.

7. **Union the rest of the dependencies** per `plan/resources/absorption-dependency-union.md`, re-checked at merge time: `@liquid-labs/git-toolkit`, `@liquid-labs/github-toolkit`, `@liquid-labs/shell-toolkit`, `@liquid-labs/liq-qa-lib`, plus `octocache` from requirement 5. No new `file:` spec.

8. **Wire in and unplug in one landing.** Add `import * as issuesGitHub from '../integrations-issues-github'` (namespace import) to `src/lib/builtin-plugins.mjs`'s `submodules`, and in the same commit remove `'@liquid-labs/liq-integrations-issues-github'` from `explicitPlugins` and from `package.json` `dependencies`. This donor registers no routes and no path variables, so the usual duplicate-registration crash would not fire — which makes leaving both paths active a **silent** double registration of its providers rather than a loud one. That is a stronger reason to land them together, not a weaker one.

9. **Preserve the setup method's exact name and deps**: `'register github issues integrations'`, `deps: ['setup integrations']`. `@liquid-labs/dependency-runner` matches by exact string, and `'setup integrations'` is a `plugable-express` framework built-in.

10. **Preserve the two provider registrations exactly as they are — including their defect.** Both `register()` calls omit `name`, which causes `IntegrationsManager.listInstalledPlugins()`'s `name`-keyed de-duplication to collapse them into one entry. **Do not fix this here.** It is out of scope (a follow-up item was recorded in Phase 3 task 002), and fixing it mid-absorption would change `GET /server/plugins/integrations/list`'s body in a way the parity contract does not license — making a real behavior change indistinguishable from an absorption regression. `providerFor` values (`tickets`, `pull request`), `providerTest` (`usesGitHubIssues`), and all seven hook registrations across the two providers must be unchanged; only `npmName` becomes `@sdlcforge/core-server`.

11. **Port the donor's test**: `src/test/uses-github-issues.test.js`. Make it run under `core-server`'s Jest/Babel/`test-staging` pipeline.

12. **Update the baselines with only the predicted diffs.** Expected here: **no change at all** to `full-tier-api-spec.json`'s 165 entries (this donor contributes no routes); both `issues-github` providers' `npmName` changes to `@sdlcforge/core-server` in the `register()`-call baseline; `full-tier-integrations-list.json`'s two-entry body changes only in `npmName`; the plugins-list entry count drops by one, reaching its final value of **9**. `golden-api-spec.json` and `golden-plugins-list.json` stay byte-identical. Halt on any unpredicted diff.

13. **Audit the bundle, with extra care.** This is the donor the undeclared-dependency hazard is named for. Confirm every bare-specifier `require(...)` surviving in `dist/sdlcforge-server.js` appears in `package.json`'s `dependencies` — `@liquid-labs/octocache` in particular — and compare bundle size against the pre-task artifact. An unexplained jump in size is a signal that something got inlined that should have been external.

## Validation

- `make build`, `make test`, `make lint`, and `bun run test:local` are all green.
- `git log --follow src/integrations-issues-github/<some-relocated-file>` reaches its original pre-relocation commits.
- `src/index.js` does not exist; `src/lib/index.js` is unchanged and still exports `appInit`, `Reporter`, `name`, `summary`.
- `explicitPlugins` holds exactly **8** entries — the plan's target count — and none of the three donors appears in it or in `package.json` `dependencies`.
- `@liquid-labs/octocache` appears in `package.json` `dependencies`. `grep -n 'file:' package.json` shows exactly the two pre-existing entries.
- The `register()`-call baseline still records **three** provider registrations with the same `providerFor` values and the same seven hook names, both `issues-github` entries still having `name === undefined`, and all three now carrying `npmName: '@sdlcforge/core-server'`.
- `full-tier-api-spec.json` is unchanged by this task (still 165 entries, no `npmName` movement) — assert this explicitly; it is the distinguishing property of this donor.
- `full-tier-plugins-list.json` has 9 entries.
- `git diff --stat <pre-merge-commit>` shows no unexpected root-level path changed.
- The report states which `determineCurrentMilestone` state was found and whether `@liquid-labs/liq-projects-lib` entered the dependency union.

## Metadata

architectural_impact: true

## Assumptions

- Phase 4 and Phase 5 tasks 001 and 002 have all landed; the aggregator already carries two submodules.
- This donor's plan slice may or may not have run its `determineCurrentMilestone` inlining task by the time this one is dispatched. Both states are valid inputs; the task branches on what it observes, and neither branch is a failure.
- The `IntegrationsManager.listInstalledPlugins()` `name`-keyed de-duplication defect is pre-existing, is captured in the Phase 3 baseline, and is deliberately carried forward unchanged.

## References

- [`plan/notes/absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) — this donor's provider/hook table, dependencies (declared and undeclared), and test to port.
- [`plan/notes/absorption-layout-and-merge-hazards.md`](../notes/absorption-layout-and-merge-hazards.md) — the landing path, the `src/index.js` collision, and the dependency-union table.
- [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#6-bundling--confirmed-safe-one-real-hazard-which-is-about-packagejson-not-rollup) — the `octocache` hazard and the bundle-audit method.
- [`plan/notes/parity-baseline.md`](../notes/parity-baseline.md#research-findings) — the provider/hook baseline and the de-duplication defect.
- `plan/phase-05-absorb-donor-plugins/001-absorb-liq-controls.md` — the pattern-setting task.

## Checkpoint hints

- After the donor branch's relocated layout is verified and the pre-merge SHA recorded.
- After the merge, with `src/index.js` removed and the blob comparison clean.
- After the `determineCurrentMilestone` state is determined and the dependency union (including `octocache`) applied.
- After the wire-in/unplug commit and the provider-registration assertions.
- After the ported test runs green, snapshot regeneration, and the bundle audit.
