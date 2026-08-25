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

## Status

**Outcome: succeeded** (2026-08-24). Pre-merge `core-server` commit: `8b9289a`. Donor merged from `liq-integrations-issues-github/plan/core-server-domain-consolidation` at `a0c4ff1`. Landed in two commits: `ccb0ff6` (merge + `src/index.js` removal + drops) and `52e8a48` (dependency union + `npmName` re-identification + wire-in + unplug + regenerated snapshots, all together).

**Headline finding (requirement 6): the `determineCurrentMilestone` inlining HAS landed.** `src/integrations-issues-github/create-or-update-pull-request.mjs:8` reads `import { determineCurrentMilestone } from './determine-current-milestone'` — a local module, not `@liquid-labs/liq-projects-lib`. **`@liquid-labs/liq-projects-lib` therefore did not enter the dependency union**, and it is now absent from `bun.lock` entirely (nothing else installed declares it). `dev-core-consolidation`'s `liq-projects-lib` phase 10 task 003 is unblocked on this account.

### Requirements

1. **Donor relocation verified independently, not assumed.** `git ls-tree -r --name-only liq-integrations-issues-github/plan/core-server-domain-consolidation -- src` — run both against the donor checkout directly and against the fetched remote-tracking ref inside this worktree — showed the `src/integrations-issues-github/…` layout (12 files) plus the donor's thin `src/index.js`. `determine-current-milestone.mjs` and its test were both present, corroborating the requirement-6 finding below. Merged with `--allow-unrelated-histories` against the donor's **plan** branch; merge commit `ccb0ff6` has two parents (`8b9289a`, `a0c4ff1`).
2. **`src/index.js` arrived as a clean, silent add** — the first branch of this requirement, confirming task 002 removed the previous one. No add/add conflict occurred. `git rm -f src/index.js` in the same merge commit; confirmed absent immediately after the merge and again after the full landing.
3. **Donor package-level files dropped.** Ten root conflicts resolved `--ours` (`.gitignore`, `AGENTS.md`, `Makefile`, `README.md`, `docs/project-structure.md`, `package.json`, `plan/TODO.yaml`, `plan/followups.yaml`, `plan/manifest.yaml`, `plan/overview.md`); eleven clean non-conflicting adds `git rm -f`'d (`docs/liq-integrations-issues-github-spec.md`, `package-lock.json`, `src/index.js`, and the donor's eight remaining `plan/` files — `plan/notes/liq-integrations-issues-github-source-inventory.md` plus the phase-12/13/14 task docs). The `plan/` removal was scoped to the enumerated arriving paths, never a blanket `git rm -r plan/`; `core-server`'s own `plan/followups.yaml` was resolved `--ours` and is byte-identical to its pre-merge blob. This donor carries no `make/`, no `bun.lock`, and no `plugable-express.yaml`. `git log --follow src/integrations-issues-github/uses-github-issues.mjs` reaches four commits ending at the donor's pre-relocation `cbd8551`.
4. **Verified by blob comparison, not by git's conflict list.** `git diff --stat 8b9289a -- . ':(exclude)src/integrations-issues-github'` was **empty** (both worktree and index) immediately after the merge — every root-level path, including the silently-merged `Makefile` and `.gitignore`, is `core-server`'s own blob. At the end of the task the same command shows only the eight files this task deliberately changed.
5. **`@liquid-labs/octocache` declared explicitly** at `^1.0.0-alpha.4` (installed `1.0.0-alpha.4`). Verified externalized rather than inlined: it appears as a bare-specifier `require("@liquid-labs/octocache")` in both `dist/` bundles. **Discrepancy from `absorption-dependency-union.md` worth recording:** the donor now declares `octocache` in its own `package.json` at exactly `^1.0.0-alpha.4` — the undeclared-import defect Requirement 2 of that document described has since been fixed upstream. The range this task declares is unchanged either way.
6. **`determineCurrentMilestone` coupling re-checked from source — inlining found LANDED.** See the headline above. The donor's `package.json` at `a0c4ff1` no longer declares `@liquid-labs/liq-projects-lib`; a full bare-specifier sweep of the donor's `src/` finds zero references to it, static or dynamic. The inlined `src/integrations-issues-github/determine-current-milestone.mjs` arrived with its own test.
7. **Dependency union re-verified against the donor branch tip.** Six added, none removed from the table's other entries, no new `file:` spec (`grep -n 'file:' package.json` still shows exactly the two pre-existing yalc entries): `@liquid-labs/git-toolkit` `^1.0.0-alpha.15`, `@liquid-labs/github-toolkit` `^1.0.0-alpha.16`, `@liquid-labs/liq-qa-lib` `^1.0.0-alpha.8`, `@liquid-labs/octocache` `^1.0.0-alpha.4`, `@liquid-labs/shell-toolkit` `^1.0.0-alpha.7`, and — **not in the union table** — `@liquid-labs/versioning` `^1.0.0-alpha.4`. `versioning` is a direct consequence of the requirement-6 finding: the inlined `determine-current-milestone.mjs` imports `minVersion` from it, so it is exactly the dependency that *replaces* `@liquid-labs/liq-projects-lib` in the union. The table's claim that "every other dependency in this table is unaffected either way" was written against the not-yet-inlined snapshot and does not hold; declaring `versioning` is mandatory for the same `nodeExternals()` reason `octocache` is. `rm -f bun.lock && bun install` refreshed the lockfile cleanly with zero remaining references to the donor package.
8. **Wire-in and unplug landed in one commit** (`52e8a48`): `import * as issuesGitHub from '../integrations-issues-github'` (namespace, extensionless) appended to `submodules` in `src/lib/builtin-plugins.mjs`, and, in the same commit, `'@liquid-labs/liq-integrations-issues-github'` removed from both `explicitPlugins` (`src/lib/app-init.mjs`) and `package.json` `dependencies`. No transient state on this branch had the donor loaded both ways. The `app-init.mjs` comment now records *why* that matters more here, not less: this donor registers no routes and no path variables, so a double load is a **silent** double registration of its two providers rather than a `Non-unique command path` crash. A real server startup (`bun run test:local`, 7/7) plus the full-tier harness's `register()` capture (exactly three registrations, not five) is the evidence that no double registration occurred.
9. **Setup method preserved exactly.** `name: 'register github issues integrations'`, `deps: ['setup integrations']`, unchanged. Asserted verbatim in two places: `full-tier-baseline.test.js`'s `EXPECTED_SETUP_METHODS` (already carried it) and, newly, `builtin-plugins.test.js`'s composed-`setup` unit test, which now asserts all three enqueued `{name, deps}` pairs.
10. **Both provider registrations preserved exactly, defect included.** `providerFor` (`tickets`, `pull request`), `providerTest` (`usesGitHubIssues`), and all seven hook registrations across the two providers are byte-unchanged. **Neither `register()` call was given a `name`** — the omission that collapses the two providers into one entry on `GET /server/plugins/integrations/list` is carried forward untouched, and is now stated as deliberate in a source comment so a later reader does not "fix" it. `npmName` is the only field changed, to `@sdlcforge/core-server`.
11. **Donor tests ported with no edits required.** Both `src/integrations-issues-github/test/uses-github-issues.test.js` (the one the task names) and `src/integrations-issues-github/test/determine-current-milestone.test.js` (which arrived with the inlining) execute — not skipped — and pass under `core-server`'s Babel/Jest/`test-staging` pipeline with zero changes. The latter's `jest.mock('@liquid-labs/octocache', …)` works unmodified.
12. **Snapshots regenerated; every diff predicted, none unpredicted.** Enumerated below. **`full-tier-api-spec.json` is byte-identical** — `git diff --stat` on it is empty, still 165 entries, and no `npmName` moved anywhere in it. That is the distinguishing property of this donor and it holds exactly.
13. **Bundle audited, with extra care.** Every bare-specifier `require(...)` surviving in both `dist/` bundles (20 specifiers each: 17 packages plus `node:fs`, `node:fs/promises`, `node:path`) is a Node builtin or a declared `package.json` dependency — **zero undeclared**, checked mechanically against `package.json`'s `dependencies` rather than by eye. `@liquid-labs/octocache` and `@liquid-labs/versioning` both appear as external `require`s, so neither was inlined. `dist/sdlcforge-server.js` 10330 → 15432 bytes; `dist/sdlcforge-server-exec.js` 10169 → 15271 bytes. The ~5.1 KB growth is fully accounted for by the absorbed source itself (11,876 raw bytes across the ten non-test modules, of which ~1.6 KB is comment text stripped by minification) — no library-sized jump, consistent with nothing having been inlined.

### Accepted snapshot diffs

- `full-tier-api-spec.json` — **no diff at all.** 165 entries, unchanged multiset, unchanged order, no `npmName` movement. Predicted exactly: this donor contributes zero routes.
- `full-tier-plugins-list.json` — **10 → 9** entries: the `@liquid-labs/liq-integrations-issues-github` entry is gone. This is the plan's final target count.
- `full-tier-integrations-list.json` — still **2** entries; one field changed, the first entry's `npmName`, `@liquid-labs/liq-integrations-issues-github` → `@sdlcforge/core-server`. Both entries now carry `@sdlcforge/core-server`; they remain two entries rather than collapsing into one because `listInstalledPlugins()` de-duplicates on `name` (`'controls'` vs. `undefined`), not on `npmName` — i.e. the preserved defect keeps behaving exactly as baselined. No reordering: `localeCompare` on two equal keys leaves the stable order intact.
- `golden-api-spec.json` and `golden-plugins-list.json` — **byte-identical**, as parity contract item 7 requires.
- `register()` capture — exactly **three** registrations, same `providerFor` values, same seven hook names, both `issues-github` entries still `name === undefined`, all three now `npmName: '@sdlcforge/core-server'`.
- Setup-method `{name, deps}` set, `app.ext` key set, and `credentialsDB` method set — all unchanged (parity contract items 5 and 6), asserted green by `full-tier-baseline.test.js`.

### Validation

| Check | Result |
| --- | --- |
| `make build` | passed |
| `make test` | passed — 12 suites, 40 tests, including both ported donor test files |
| `make lint` | **failed, pre-existing and unchanged** — 230 errors, identical count and identical file set to tasks 001 and 002 (`test/get-node-versions.js`, `test/test-basic.js`, `test/test-integration-quick.js`, `test/test-server.js`). **Zero** lint errors in `src/`, including the whole absorbed `src/integrations-issues-github/` tree. Not fixed: those four files are outside this task's scope, and reformatting them would break requirement 4's "no unexpected root-level path changed" check. |
| `bun run test:local` | passed — 7/7 endpoints against a real server startup; no silent double registration and no startup crash |
| `explicitPlugins` count | **8** — the plan's target; none of the three donors appears in it or in `package.json` `dependencies` |
| `src/index.js` | absent; `src/lib/index.js` byte-identical to its pre-merge blob and still exporting `appInit`, `Reporter`, `name`, `summary` |
| `grep -n 'file:' package.json` | exactly the two pre-existing yalc entries |

### Affected files

- `src/integrations-issues-github/**` (12 files) — absorbed, byte-identical to the donor except `index.js` (`npmName` re-identification on both `register()` calls, plus the comment recording why the missing `name` stays missing)
- `src/lib/builtin-plugins.mjs`, `src/lib/app-init.mjs` — wire-in and unplug
- `src/lib/test/builtin-plugins.test.js` — `ABSORBED_SUBMODULES` now includes `issuesGitHub`; the composed-`setup` test asserts all three enqueued `{name, deps}` pairs
- `src/lib/test/full-tier-baseline.test.js` — both `issues-github` providers' expected `npmName`
- `package.json`, `bun.lock` — dependency union and unplug
- `test/__snapshots__/full-tier-{plugins-list,integrations-list}.json` — regenerated; `full-tier-api-spec.json` and both `golden-*` snapshots untouched

### Notes

- **`@liquid-labs/versioning` is a union-table addition this plan did not predict** (requirement 7 above). It is not a discretionary add: without it, `nodeExternals()` would inline it into `dist/` exactly as the plan feared for `octocache`. `plan/resources/absorption-dependency-union.md` remains accurate for the state it was captured in; its Requirement 4 caveat ("Phase 5 task 003 must re-check") is what caught this.
- **`@liquid-labs/liq-projects-lib` dropped out of `bun.lock` entirely** once the donor stopped declaring it — no other installed package declares it. A stale, unpruned `node_modules/@liquid-labs/liq-projects-lib` directory survives on disk, as does one for the donor package itself; both are inert (zero lockfile references, absent from `GET /server/plugins/list`).
- The `liq-integrations-issues-github` git remote added per requirement 1 remains configured in the shared repository config, alongside the `liq-controls` and `liq-credentials` remotes tasks 001 and 002 added.

## Checkpoint hints

- After the donor branch's relocated layout is verified and the pre-merge SHA recorded.
- After the merge, with `src/index.js` removed and the blob comparison clean.
- After the `determineCurrentMilestone` state is determined and the dependency union (including `octocache`) applied.
- After the wire-in/unplug commit and the provider-registration assertions.
- After the ported test runs green, snapshot regeneration, and the bundle audit.
