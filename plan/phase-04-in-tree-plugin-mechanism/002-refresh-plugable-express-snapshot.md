# Refresh Plugable-Express Yalc Snapshot

## Purpose and scope

Pull the `builtinPlugins`-carrying `@liquid-labs/plugable-express` into `core-server`'s dependency tree and prove that the refresh **by itself** changed nothing observable, before any `core-server` code starts using the new affordance.

This task exists purely for attribution. Regenerating `bun.lock` re-resolves every dependency in the tree, not just the one that was pushed — so an unrelated regression introduced by that refresh, if discovered later, would be indistinguishable from a regression introduced by the absorption. Landing and verifying the refresh on its own makes the attribution unambiguous.

Scope is dependency state and verification only. **Add no new source file and change no existing source file.** `src/lib/builtin-plugins.mjs` and the `app-init.mjs` wiring are task 003's job, not this one.

## Requirements

1. **Refresh the yalc link the documented way.** From `core-server`: `rm -f bun.lock && bun install` — **never** a bare `bun install`. Under Bun, once `bun.lock` holds a resolved `file:` entry, a bare install re-copies the linked package's content but silently skips re-resolving its transitive dependencies, so a new transitive dependency introduced by the framework change would be missing at runtime with no error at install time. `./scripts/provision-local-deps.sh --refresh-lock` is the equivalent wrapper if it is the more convenient entry point.

2. **Confirm the snapshot actually moved.** After the refresh, `.yalc/@liquid-labs/plugable-express/package.json`'s version and the presence of `loadBuiltinPlugins` in its `src/lib/load-plugins.js` must match what task 001 recorded. A refresh that leaves the old snapshot in place is a silent no-op and must be reported as a failure, not proceeded past.

3. **Report the full diff the refresh brought in.** `git diff` on `bun.lock` and `package.json`, plus a summary of every dependency whose resolved version changed — not just `plugable-express`'s. This is the record that makes later attribution possible; a bare "refresh done" report defeats the task's purpose.

4. **Re-verify the full existing surface, in this order**, and treat any difference as a finding to report rather than a snapshot to update:
   - `make build` — both `dist/sdlcforge-server.js` and `dist/sdlcforge-server-exec.js` produced.
   - `make test` — the whole Jest suite, including Phase 3's new full-tier harness.
   - `make lint`.
   - `bun run test:local` — the local integration pass against a really-started server.
   - `test/__snapshots__/golden-api-spec.json`, `golden-plugins-list.json`, `full-tier-api-spec.json`, `full-tier-plugins-list.json`, and `full-tier-integrations-list.json` all still compare **green without regeneration**.

5. **Do not regenerate any snapshot.** If a snapshot no longer matches after the refresh, that is the finding — the framework change was supposed to be additive and no existing test passes `builtinPlugins`. Report the exact diff and halt rather than re-recording it; re-recording would bury a framework regression inside this plan's own accepted-diff budget.

6. **Note the bundle size** of `dist/sdlcforge-server.js` before and after the refresh. Phase 5's absorb tasks compare against a pre-absorption artifact, and this task establishes what "pre-absorption" means once the framework has moved.

## Validation

- `.yalc/@liquid-labs/plugable-express/` carries the version task 001 recorded, and `loadBuiltinPlugins` is present in it.
- `make build`, `make test`, `make lint`, and `bun run test:local` are all green.
- All five snapshot files are unchanged in `git diff` — no regeneration occurred.
- `git diff --stat` shows changes confined to `bun.lock` (and, if the refresh legitimately moved a range, `package.json`); no file under `src/` or `test/` is modified.
- `grep -n 'file:' package.json` shows exactly the two pre-existing entries (`@liquid-labs/liq-projects`, `@liquid-labs/plugable-express`) and no third.
- The report names the pre- and post-refresh `dist/sdlcforge-server.js` byte sizes and lists every dependency whose resolved version changed.

## Assumptions

- Task 001 has passed and recorded the target `plugable-express` commit and version. If it has not, this task is blocked; halt.
- Network access may be required for `bun install` to re-resolve registry-hosted dependencies. If the environment blocks it, halt and report rather than hand-editing `bun.lock`.
- The framework change is additive: no existing test in `core-server` passes `builtinPlugins`, so nothing should observably change. This assumption is exactly what the task is testing — a violation is a finding, not an error in the plan.

## References

- `CLAUDE.md` / `AGENTS.md` — the documented `rm -f bun.lock && bun install` sequence and the Bun `file:`-dependency caveat behind it.
- [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#sequencing-the-framework-change) — why this refresh is verified as its own step between the framework change and `core-server`'s own wiring.
- `plan/phase-04-in-tree-plugin-mechanism/001-verify-plugable-express-builtin-plugins.md` — the gate whose recorded version this task must match.

## Status

**Outcome: validation failed.** Date: 2026-08-24. Worktree: `worktrees/plan/core-server-domain-consolidation-04-002`.

### Requirement 1 — refresh performed the documented way

`rm -f bun.lock && bun install` (never a bare `bun install`) run from `core-server`'s worktree root. `bun install v1.3.14`, "Resolved, downloaded and extracted [801]", 18 packages reported (re)installed. `git diff --stat` afterward shows the change confined to `bun.lock` alone — `package.json` needed no edit, since no declared version range needed to move.

### Requirement 2 — snapshot confirmed moved, matching task 001's recorded target

- `.yalc/@liquid-labs/plugable-express/package.json` version: `1.0.0-alpha.58` (unchanged string, as task 001 also observed — the version string does not bump between snapshot pushes).
- The packed `.yalc/@liquid-labs/plugable-express/` ships **only** `dist/` + `package.json` + `README.md` (per its own `"files": ["./dist", "README.md"]`) — there is no `src/lib/load-plugins.js` on disk to grep, so — following task 001's own verification method for this same artifact — the check was performed against what `core-server` actually loads at runtime: `.yalc/@liquid-labs/plugable-express/dist/plugable-express.js`. `grep -ic 'builtinplugins'` → 4 matches (was 0 in the pre-`builtinPlugins` snapshot task 001 first caught); `grep -c "Each 'builtinPlugins' entry must define both"` (the distinguishing new-affordance error string) → 1 match.
- Byte-level cross-check: `shasum -a 256` of this worktree's `.yalc/@liquid-labs/plugable-express/dist/plugable-express.js` is **identical** to `/Users/zane/playground/liquid-labs/plugable-express/dist/plugable-express.js` (producer checkout, `HEAD a95c4cf0e12e98a6f15ae98930ed5659dc6c3013`) — `f36fb4d69017c7f1b240bb223c10317011ddce82427b032c3ab1e15275dd447a` on both sides. This is the identical commit/version task 001 recorded; the snapshot did not silently no-op.

### Requirement 3 — full diff report

`git diff --stat`: `bun.lock | 80 +++++++++++++++++++++++++++++++++-------------------------------` (41 insertions, 39 deletions), nothing else changed.

Every dependency whose **resolved version** changed (beyond `plugable-express`'s own content refresh, which keeps the same version string):

| Package | Before | After | Note |
|---|---|---|---|
| `@liquid-labs/liq-orgs` | 1.0.0-alpha.7 | 1.0.0-alpha.8 | gained a new declared dependency, `@liquid-labs/playground-monitor` (`file:.yalc/@liquid-labs/playground-monitor`) — resolved cleanly; that yalc directory was already present in the manager's pre-copied `.yalc/` |
| `@liquid-labs/liq-work` | 1.0.0-alpha.10 | 1.0.0-alpha.11 | dropped its declared dependency on `@liquid-labs/liq-projects-lib` |
| `@liquid-labs/plugable-projects-audit` | 1.0.0-alpha.2 | 1.0.0-alpha.3 | its `@liquid-labs/http-smart-response` dependency changed from a `file:.yalc/...` link to an ordinary `^1.0.0-alpha.6` semver range |
| `@types/node` | 26.2.0 | 26.3.0 | routine devDependency bump |
| `baseline-browser-mapping` | 2.11.14 | 2.11.19 | transitive, browserslist data |
| `caniuse-lite` | 1.0.30001809 | 1.0.30001810 | transitive, browserslist data |
| `electron-to-chromium` | 1.5.407 | 1.5.413 | transitive, browserslist data |
| `get-tsconfig` | 4.14.2 | 4.14.3 | transitive |
| `is-plain-object` | 5.0.0 | 5.1.0 | transitive |
| `marked` | 18.0.9 | 18.0.11 | transitive |
| `negotiator` | 1.0.0 | 1.1.0 | transitive; now itself depends on a new package, `content-type@2.1.0` (added to the lockfile) |
| `picomatch` | 4.0.5 | 4.0.7 | transitive |
| `rollup` (+ all 22 `@rollup/rollup-<platform>` optional binaries) | 4.62.4 | 4.62.5 | build-tool devDependency, lockstep bump |

Lockfile bookkeeping change (not a version bump): the resolution-tree entry `@liquid-labs/plugable-projects-audit/@liquid-labs/http-smart-response` (a nested `file:` link) was replaced by `@liquid-labs/liq-orgs/@liquid-labs/playground-monitor` (a different nested `file:` link), consistent with the two dependency changes above.

No dependency of `core-server`'s own direct `dependencies` block changed resolution target or version.

### Requirement 4 — full existing surface re-verified

- `make build` — **green**, both before and after the refresh. `dist/sdlcforge-server.js` and `dist/sdlcforge-server-exec.js` both produced cleanly.
- `make test` — **green**. `Test Suites: 4 passed, 4 total`, `Tests: 13 passed, 13 total` (includes `golden-api-spec.test.js`, `app-init.test.js`, `index.test.js`, and Phase 3's `full-tier-baseline.test.js`).
- `make lint` — **failed**, but proven pre-existing and unrelated to this refresh (see Finding 1 below).
- `bun run test:local` — **green** (7/7 endpoint checks passed against a really-started server), but only after a one-time per-machine `bun link` provisioning step this worktree lacked (see Finding 2 below) — not itself a refresh-caused regression, also detailed below.
- All five named snapshot files (`golden-api-spec.json`, `golden-plugins-list.json`, `full-tier-api-spec.json`, `full-tier-plugins-list.json`, `full-tier-integrations-list.json`) — **unchanged**, confirmed both by `make test` passing (these are Jest snapshot/deep-equal comparisons) and directly via `git diff --stat -- test/__snapshots__/...` returning empty. No regeneration occurred (Requirement 5 honored).

### Requirement 6 — bundle size before/after

`dist/sdlcforge-server.js`: **2214 bytes before, 2214 bytes after** (byte-identical).
`dist/sdlcforge-server-exec.js`: **2047 bytes before, 2047 bytes after** (byte-identical).

Unsurprising and expected: Rollup's `nodeExternals()` externalizes `@liquid-labs/plugable-express` and every other `node_modules` dependency (per the mechanism design note's Bundling analysis) — only `core-server`'s own relative-import `src/` graph is inlined, and this task changed none of that. The refresh moves resolution/content in `node_modules`/`.yalc/`, not anything Rollup bundles into these two files.

### Finding 1 — `make lint` fails, proven pre-existing and unrelated to the refresh (blocks the Validation gate)

`make lint` reports 230 ESLint errors, all inside `test/get-node-versions.js`, `test/test-basic.js`, `test/test-integration-quick.js`, and `test/test-server.js` (key-spacing, trailing-whitespace, brace-style, and similar style violations — none of them near anything touched by this refresh).

Proven unrelated by controlled comparison: `git stash` (reverting `bun.lock` to its pre-refresh committed state), `bun install`, `make lint` — **identical** 230 errors, same files, same line numbers. `git stash pop` restored the refresh. `git log --oneline -- test/test-server.js test/test-basic.js test/test-integration-quick.js test/get-node-versions.js` shows the most recent touch to any of these files predates this plan-group entirely (`8852ab7 chore: drop liq-integrations and plugable-server-documentation deps` and older) — this is long-standing project lint debt, not something this plan-group's earlier phases introduced.

This task's own scope forbids the only fix available (`## Requirements`: "no existing source file" changed; `## Validation`: "no file under `src/` or `test/` is modified") — fixing these 230 errors would require editing exactly the `test/*.js` files this task must not touch. Per this task's own Validation section, `make lint` green is nonetheless a listed requirement, so this is reported as a validation failure rather than silently waived. Recommend the manager either accept this task on the strength of the above proof (the refresh introduced zero lint regression; the debt is pre-existing and out of this plan-group's own history) or route a separate, appropriately-scoped follow-up task to clean up `test/*.js` lint debt.

### Finding 2 — `bun run test:local` needed a one-time `bun link` before it would run at all (environment gap, not a refresh regression)

First attempt failed: `Error: Failed to start server: spawn sdlcforge-server ENOENT` from `test/test-server.js`, which `spawn()`s the binary by bare name (`BINARY_NAME`, read from `package.json`'s `bin` key) and relies on PATH resolution. `node_modules/.bin/sdlcforge-server` did not exist in this freshly-provisioned worktree — expected: a plain `bun install` does not self-link a root package's own `bin` entry into its own `node_modules/.bin` (that requires an explicit link step). Confirmed via the same `git stash` methodology as Finding 1 that this absence is identical before and after the refresh — not something the refresh caused.

Ran `bun link` once (registers `@sdlcforge/core-server` and symlinks `sdlcforge-server` into `~/.bun/bin`, which was already on `PATH`) — a per-machine provisioning step touching no git-tracked file. After that, `bun run test:local` passed cleanly (7/7). Flagging for awareness since a fresh worktree apparently needs this step for `test:local` to run at all; not treated as this task's own scope to fix or document further.

### Incidental finding re-checked — `weak-cache` / `federated-json` devDependency gap (per the dispatch prompt's specific ask)

Per task 001's incidental finding, `plugable-express`'s `src/app.js` imports `WeakCache` (`@liquid-labs/weak-cache`) and `readFJSON` (`@liquid-labs/federated-json`) in production code paths, but both are declared only in `plugable-express`'s own `devDependencies`. Checked directly against this task's own `bun.lock` regeneration:

- `@liquid-labs/weak-cache` — **absent** from both `bun.lock` and `node_modules` after the refresh (confirmed via `grep`/`find`); genuinely not resolved anywhere in this tree.
- `@liquid-labs/federated-json` — **present**, but only as an incidental transitive dependency of unrelated packages (`liq-projects`, `liq-work`, `liq-qa-lib`, etc.), not because anything resolves it on `plugable-express`'s behalf.

Despite this, it does **not** manifest as an actual resolution problem: grepping the packed `.yalc/@liquid-labs/plugable-express/dist/plugable-express.js` for `require('@liquid-labs/weak-cache')` / `require('@liquid-labs/federated-json')` returns **zero** hits for either, while `WeakCache` (3 occurrences) and `readFJSON` (7 occurrences) both appear as inlined source. Because both packages are misclassified as `devDependencies`-only in `plugable-express`'s own `package.json`, its own Rollup build's `nodeExternals()` treats them as **not** external and bundles their source directly into the packed `dist/plugable-express.js` at pack time — so `core-server` never needs a runtime `node_modules` resolution of either package. `make test` and `bun run test:local` both exercising real `appInit()` calls and passing cleanly is the empirical confirmation. Still worth fixing upstream (a `dependencies`-vs-`devDependencies` misclassification is fragile — a change to `plugable-express`'s own build config could silently break this), but it is not a live problem for this refresh.

### Overall

Every part of this task's own purpose — pull the `builtinPlugins`-carrying snapshot in, and prove the refresh by itself changed nothing observable — is fully satisfied and evidenced above: `make build`/`make test` green, all five snapshots byte-unchanged, the diff fully attributed and confined to `bun.lock`, bundle size unchanged, and the one item flagged for awareness (the `weak-cache`/`federated-json` devDependency gap) proven to be a non-issue in practice. The task nonetheless reports `validation failed` because `## Validation` lists `make lint` as a required green check, and that check fails for reasons (Finding 1) proven pre-existing, proven unrelated to this refresh, and out of this task's permitted edit scope to fix.
