# Verify Core-Server Absorption

## Purpose and scope

Read-only verification gate. Confirms `@sdlcforge/core-server` has actually landed `liq-integrations-issues-github`'s absorption before any retirement documentation or metadata work proceeds. Mirrors the `liq-orgs` precedent from the sibling `dev-core-consolidation` plan-group (`plan/phase-06-retire-liq-orgs/001-verify-dev-core-absorption.md`, recorded in that repository's `plan/plan-summary-dev-core-consolidation.md`) and the equivalent gate tasks the sibling donors `liq-controls` and `liq-credentials` carry in this same plan-group.

**This donor's gate is harder to satisfy than either sibling's, and the reason shapes every check below: it contributes zero HTTP routes.** There is no route table, api-spec entry, or handler count that can tell you whether the absorption worked. The two integration-provider registrations and their seven hooks are the entire observable contract, so the checks here are registration-shaped rather than route-shaped. Resist the temptation to substitute "`core-server`'s route count looks right" for any of them — it proves nothing about this donor.

**This task must not be dispatched — and if dispatched, must not pass — until `core-server`'s own `core-server-domain-consolidation` absorption phase has merged.** This plan's tooling (a single project's `TODO.yaml`) cannot express or enforce a cross-project phase dependency; the dispatching manager must hold this task until `core-server`'s [`plan/phase-05-absorb-donor-plugins/003-absorb-liq-integrations-issues-github.md`](/Users/zane/playground/sdlcforge/core-server/worktrees/plan/core-server-domain-consolidation/plan/phase-05-absorb-donor-plugins/003-absorb-liq-integrations-issues-github.md) is confirmed landed. Halt with a clear "blocked: precondition not met" report rather than guessing or partially proceeding if dispatched early.

## Requirements

Verify each of the following against `core-server`'s own checkout (`/Users/zane/playground/sdlcforge/core-server`) — live source and a live run, not `core-server`'s plan documents, which describe intent that may not have landed exactly as written. This task **edits nothing, in any repository**.

1. **File census.** Every file Phase 13 relocated to `src/integrations-issues-github/…` (the mapping table in [`plan/phase-13-relocate-plugin-source/001-restructure-src-into-core-server-layout.md`](../phase-13-relocate-plugin-source/001-restructure-src-into-core-server-layout.md), reconciled against what that task actually reported moving) is present under `core-server`'s own absorbed path. Expected `src/integrations-issues-github/…`; confirm the actual path used rather than assuming, and report any divergence.

2. **History preserved.** `git log --follow` on at least one absorbed file (e.g. `src/integrations-issues-github/create-or-update-pull-request.mjs`) inside `core-server` reaches this repository's pre-relocation commits — confirming the history-preserving merge, not a copy-paste.

3. **Both provider registrations present, exactly once each.** `core-server`'s aggregated registration surface includes both, with `providerFor` `'tickets'` and `'pull request'`, `providerTest` `usesGitHubIssues` on both, and seven hook registrations across the two — `getCurrentIntegrationUser`, `getIssueURL`, `getProjectURL` on `tickets`; `createOrUpdatePullRequest`, `getCurrentIntegrationUser`, `getPullRequestURLsByHead`, `getQALinkFileIndex` on `pull request`. Each provider must appear **exactly once**: a duplicate is the signature of a shim or an npm-dependency copy left loaded alongside the in-tree module. Note that this donor registers no routes and no path variables, so a duplicate here would **not** trigger `plugable-express`'s `Non-unique command path` or `Path variable … already registered` crash — the double registration would be silent. Check for it explicitly; do not rely on the server failing to start.

4. **`npmName` repointed on both registrations.** Both now carry `npmName: '@sdlcforge/core-server'` rather than `'@liquid-labs/liq-integrations-issues-github'`. This is the one field `core-server`'s absorb task is licensed to change.

5. **The missing-`name` defect carried forward unchanged.** Both `register()` calls must still omit `name`. This is the deliberate preservation of a pre-existing defect (anomaly 4); its **absence** is expected and correct, and a `name` appearing on either registration means someone fixed it mid-absorption, which invalidates `core-server`'s own parity baseline. Report a fix as a finding, not as an improvement.

6. **Setup method name and deps intact.** `core-server`'s absorbed source still pushes a setup method with `name: 'register github issues integrations'` and `deps: ['setup integrations']`, byte-identical. `@liquid-labs/dependency-runner` matches by exact string; a drift here fails silently at registration time rather than loudly at build time.

7. **`determineCurrentMilestone` absorbed in its inlined form, with its dependencies declared.** `core-server` carries `src/integrations-issues-github/determine-current-milestone.mjs` (or whatever path the absorption used) and **not** an import of `determineCurrentMilestone` from `@liquid-labs/liq-projects-lib`. Correspondingly, `core-server`'s `package.json` must declare `@liquid-labs/versioning` and `@liquid-labs/octocache`, and must **not** have gained `@liquid-labs/liq-projects-lib`. `core-server`'s absorb task branches on which state it finds; this check confirms the post-inline branch was the one taken. If `core-server` did gain `@liquid-labs/liq-projects-lib`, that is a hard finding — it means a pre-inline tree was absorbed, and `liq-projects-lib`'s own deprecation is not actually unblocked.

8. **Bundle externality.** `@liquid-labs/octocache` and `@liquid-labs/versioning` survive as bare-specifier `require`s in `core-server`'s `dist/sdlcforge-server.js` rather than being inlined into it. This is the specific hazard `core-server`'s absorb task names for this donor: `nodeExternals()` decides externality from `package.json`, so an undeclared bare specifier gets quietly bundled, the build stays green, and the artifact breaks only for a registry consumer whose transitive graph differs.

9. **Dependency unplugged.** `core-server`'s own `package.json` no longer lists `@liquid-labs/liq-integrations-issues-github` in `dependencies`, and it is gone from the `explicitPlugins` array in `src/lib/app-init.mjs` and from the expected-plugin lists in `test/test-basic.js` and `test/test-integration-quick.js`.

10. **Host contract still satisfied.** The absorbed hooks read `app.ext.credentialsDB.getToken('GITHUB_API')` and `app.ext._liqProjects.playgroundMonitor.getProjectData(...)`. Confirm observably that both are live in `core-server`'s full-tier harness after absorption — this donor consumes those contracts and publishes none of its own, so a break here shows up only at hook-invocation time, not at startup.

11. **Test ported.** This donor's `test/uses-github-issues.test.js` — and `test/determine-current-milestone.test.js`, if Phase 12 landed it — actually run inside `core-server`'s Jest/Babel/`test-staging` pipeline (present *and* executing, not merely present on disk).

12. **Build health.** `core-server`'s `make build` / `make test` / `make lint` (or the Bun-based equivalents in its own `CLAUDE.md`: `bun run build`, `bun run test`, `bun run lint`, `bun run test:local`) are green.

## Validation

- Every check in Requirements above is independently confirmed against live source and a live run in `core-server`'s checkout, not inferred from either project's plan documents.
- Requirement 3's "exactly once" is confirmed by an actual enumeration of the registration surface, not by the absence of a startup crash — this donor's duplicate-registration failure mode is silent.
- If any check fails or cannot be confirmed — including "the absorption phase has not landed at all" — this task halts the phase: do not proceed to tasks 002–004, and report the specific gap(s) found, naming the requirement number.
- If all checks pass, record the confirmation (the `core-server` commit SHA verified against, and the absorbed path actually used) in the task report so tasks 002–004 can proceed without re-deriving it.
- This task makes no edits to any file in any repository. `git status` in both checkouts is unchanged by it.

## Assumptions

- The absorbed path is `src/integrations-issues-github/…`, as named in `core-server`'s own absorb task. Confirm it from `core-server`'s committed source rather than assuming this survived that phase's own execution unchanged.
- `core-server`'s absorb task will have `git rm`'d the thin `src/index.js` re-export Phase 13 left in place. Its **absence** in `core-server` is the expected, correct state — do not report it as a missing file. (`core-server`'s own `src/lib/index.js`, a different file, must still exist and still export `appInit`, `Reporter`, `name`, `summary`.)
- `core-server`'s absorb task also expects **no change** to `full-tier-api-spec.json` from this donor, since it contributes no routes. If its own baselines show route movement attributed to this donor, that is a finding worth reporting even though it is `core-server`'s artifact rather than this repository's.

## References

- [`plan/notes/liq-integrations-issues-github-source-inventory.md`](../notes/liq-integrations-issues-github-source-inventory.md) — the pre-move baseline (file census, provider/hook table, host contract, dependency inventory, consumer inventory) these post-absorption checks compare against.
- [`core-server`'s absorb task for this donor](/Users/zane/playground/sdlcforge/core-server/worktrees/plan/core-server-domain-consolidation/plan/phase-05-absorb-donor-plugins/003-absorb-liq-integrations-issues-github.md) — its own `## Validation` section is the mirror image of this gate; a disagreement between the two is itself a finding worth reporting.
- `liq-orgs`'s `plan/plan-summary-dev-core-consolidation.md` (`/Users/zane/playground/liquid-labs/liq-orgs/plan/`) — the precedent this task's read-only, requirement-group-per-check gate structure follows.
