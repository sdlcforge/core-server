# Verify Plugable-Express Builtin-Plugins Mechanism

## Purpose and scope

Read-only cross-project verification gate. Confirms that `@liquid-labs/plugable-express` has actually landed the `builtinPlugins` `appInit` affordance — and landed it in the shape this plan's design depends on — before `core-server` spends any work sitting on top of it.

`@liquid-labs/plugable-express` is a **fifth federated participant** of this plan-group with its **own plan slice, its own plan worktree, and its own phase numbers**. Its implementation tasks are authored and executed there, not here. This task is the `core-server` side of that boundary and mirrors, in the opposite direction, `liq-controls`' own `plan/phase-02-retire-liq-controls/001-verify-core-server-absorption.md` gate against this project.

**This task must not be dispatched — and if dispatched, must not pass — until `plugable-express`'s own `builtinPlugins` phase has merged and been pushed to `core-server`'s yalc link.** A single project's `TODO.yaml` cannot express or enforce a cross-project phase dependency; the dispatching manager holds this task until that landing is confirmed. Halt with a clear "blocked: precondition not met" report rather than guessing, partially proceeding, or — under any circumstances — implementing the framework change here.

This task makes **no edits to any file in any repository**. Read-only by design.

## Requirements

Verify against `@liquid-labs/plugable-express`'s own checkout at `/Users/zane/playground/liquid-labs/plugable-express`, and against `core-server`'s linked copy at `.yalc/@liquid-labs/plugable-express/`:

1. **`registerPluginModule` exists and is the single `setup()` call site.** In `src/lib/load-plugins.js`, the module-resolution half of `loadPlugin` (identity from `pkg`, the dynamic `import`) is separated from the registration half (export validation, `setup?.(...)`, `setupData` thenable-await, the `app.ext.pendingHandlers.push`, and the `app.ext.handlerPlugins.push`), and both the npm path and the builtin path reach the **same** function. Grep the whole package to confirm there is exactly one `setup?.(` / `setup(` plugin-invocation site. Parity of the setup argument object is guaranteed structurally by that single call site, not by inspection of two copies — if there are two call sites, the guarantee is gone and this gate fails.

2. **The setup argument object is unchanged.** That single call site passes exactly `{ app, cache, reporter, registerPathVar, serverConfigRoot: app.ext.serverConfigRoot }` — five members, same names. `liq-credentials`' setup consumes four of them (`app`, `cache`, `registerPathVar`, `serverConfigRoot`); a missing or renamed member is a silent breakage at absorb time, not a loud one.

3. **`loadBuiltinPlugins` exists and behaves as designed.** It skips cleanly on an absent or empty array, throws on an entry missing `npmName` or `module`, honors the shared `loadedPluginNames` duplicate set, and — deliberately — applies **no** `supersededPlugins` check, **no** `summary` regex normalization, and **no** `handlerPlugins` de-duplication. Each of those three non-features is intentional; a "helpful" addition of any of them breaks this plan's design and must be reported rather than accepted.

4. **The `app.js` call site is correctly placed.** `loadBuiltinPlugins` is called **inside** the `if (skipCorePlugins !== true)` guard and **before** the core `loadPlugins` call, threading the same `cache`, `reporter`, `registerPathVar`, and `loadedPluginNames`. Placement is load-bearing in both respects:
   - **Inside the guard** is what resolves the `load orgs` hazard and what lets `core-server`'s two existing `skipCorePlugins: true` tests keep passing with zero edits.
   - **Before `loadPlugins`** is what makes absorbed-route position deterministic (`find-plugins` scan order is not caller-controllable) and what seeds `loadedPluginNames` so a discovered package colliding with a builtin `npmName` is skipped as the duplicate rather than the other way round.

5. **Nothing downstream of plugin loading moved.** Confirm the four-stage sequence is intact and in this order: `app.ext.pendingHandlers` drained → the two error-handling `app.use(...)` layers installed → `DependencyRunner` over `app.ext.setupMethods` → the `apiSpecPath` file write. This ordering is the entire reason the mechanism exists; a change here silently alters absorbed routes' error responses and the written API spec.

6. **The reload path carries the option.** `app.reload()` re-invokes `appInit(Object.assign({}, initArgs, { app }))`, so `builtinPlugins` must live in `initArgs` and survive a reload unchanged. Confirm by reading, and note that `clearRegistry()` runs before any plugin loading so a re-registered path variable does not trip `Path variable '<name>' is already registered.`

7. **Public surface unchanged.** `loadBuiltinPlugins` is **not** added to the package's public `src/index.js`. `core-server` needs only `appInit`.

8. **The framework's own suite is green**, including whatever tests its slice added for the new affordance, and its version has been bumped and pushed to `core-server`'s `.yalc/` snapshot. Record the `plugable-express` commit SHA and version the verification was taken against — the next task's `bun.lock` regeneration must be against that same snapshot.

## Validation

- Every requirement above is independently confirmed against live source in `plugable-express`'s checkout and in `core-server`'s `.yalc/` copy — never inferred from `plugable-express`'s own plan documents, which describe intent that may not have landed exactly as written.
- The two checkouts agree: the `.yalc/` snapshot's `package.json` version and the relevant source files match the producer's `HEAD`. A stale yalc snapshot is a failed gate, not a detail to work around.
- If any check fails or cannot be confirmed — including "the framework phase has not landed at all" — this task halts the phase. Do not proceed to tasks 002 or 003; report the specific gap(s) found, naming the file and line for each.
- If all checks pass, record the confirmation (commit SHAs, version, file paths and line numbers checked) in the task report so tasks 002 and 003 can proceed without re-deriving it.
- `git status` in both repositories is unchanged by this task.

## Assumptions

- The design in [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#mechanism-design-research-pass) is what `plugable-express`'s own slice was authored from. Small, well-reasoned divergences (naming, jsdoc wording, test structure) are fine and should be reported, not failed. Divergences that change **placement**, the **setup argument object**, or the **gating semantics** are gate failures.
- As of this plan's authoring the yalc snapshot was current with `plugable-express`'s `HEAD` (both at `1.0.0-alpha.58`), so the "a refresh pulls in whatever else has landed since" integration risk was approximately zero. That will not stay true; re-check as part of requirement 8 and report what else has changed in the interval.

## Status

**Outcome: blocked — precondition not met.** Date: 2026-08-24.

Requirements 1–7, and the test-suite half of Requirement 8, are independently confirmed against `@liquid-labs/plugable-express`'s live source at `main` HEAD `a95c4cf0e12e98a6f15ae98930ed5659dc6c3013` (`package.json` version `1.0.0-alpha.58`, working tree clean apart from an untracked `.flow/`). Requirement 8's yalc-snapshot cross-check fails: the packed artifact actually consumed by `core-server` does not contain the mechanism at all, even though the version string matches. **This is the specific reason the task halts — do not proceed to tasks 002 or 003 until a real `yalc push` (with a rebuild) has landed.**

### Requirements 1–7 — confirmed against `/Users/zane/playground/liquid-labs/plugable-express` (main checkout, HEAD `a95c4cf0e12e98a6f15ae98930ed5659dc6c3013`)

1. **Single `setup()` call site — confirmed.** `src/lib/load-plugins.js` splits exactly as designed: `registerPluginModule` (lines 20–39) holds export validation, the sole `setup?.(...)` invocation (line 27), the thenable `setupData` await (lines 28–30), and the `pendingHandlers` push (lines 32–38). `loadPlugin` (lines 44–52, npm path) and `loadBuiltinPlugins` (lines 66–88, builtin path) both resolve their arguments and call `registerPluginModule` (lines 51 and 85 respectively). Package-wide grep for `setup?.(` / `setup(` outside `src/*/test/`: exactly one hit, `load-plugins.js:27`.
2. **Setup argument object unchanged — confirmed.** `load-plugins.js:27`: `setup?.({ app, cache, reporter, registerPathVar, serverConfigRoot : app.ext.serverConfigRoot })` — five members, same names as the pre-existing contract.
3. **`loadBuiltinPlugins` behavior — confirmed.** `load-plugins.js:66–88`: no-ops on absent/empty `builtinPlugins` (line 67); throws `"Each 'builtinPlugins' entry must define both 'npmName' and 'module'."` when either is missing (lines 74–76); honors the shared `loadedPluginNames` set, warning and `continue`-ing on a duplicate `npmName` (lines 80–83) and adding newly-registered names to it (line 86). Read the function in full: no `supersededPlugins` reference, no `summary`/description regex, no `handlerPlugins` de-duplication logic anywhere in it — all three intentional omissions are actually absent, not merely untested.
4. **`app.js` call site placement — confirmed.** `src/app.js:146–150`: `loadBuiltinPlugins(...)` is called at line 147, strictly inside `if (skipCorePlugins !== true)` (line 146) and strictly before the core `loadPlugins(...)` call (line 150), threading the same `cache`, `reporter`, `registerPathVar`, and `loadedPluginNames` (the `Set` instantiated at line 144, shared across both calls).
5. **Four-stage sequence intact — confirmed.** In `src/app.js`: `pendingHandlers` drain at lines 166–168; the two error-handling `app.use(...)` layers at lines 171–226; `DependencyRunner` over `app.ext.setupMethods` at lines 230–235; the `apiSpecPath` `fs.writeFile` at lines 237–241. Order and adjacency unchanged from the design note's description.
6. **Reload path — confirmed.** `app.reload` (lines 129–132) re-invokes `appInit(Object.assign({}, initArgs, { app }))`; `builtinPlugins` is destructured from `initArgs` at line 53, so it survives a reload unchanged (it is part of the reused `initArgs` object, never rebuilt per-call). `clearRegistry()` runs at line 66, before any plugin loading (builtins begin at line 147).
7. **Public surface unchanged — confirmed.** `src/index.js:1–6` exports exactly `{ appInit, IntegrationsManager, Reporter, startServer }` — no `loadBuiltinPlugins`. `src/lib/index.js:3` (`export * from './load-plugins'`, the *internal* lib index) does re-export it, which is what lets `src/app.js` and the package's own tests reach it — but that file is not the public package entry, so this is consistent with the requirement.

### Requirement 8 — split result

**8a. Test suite — green, and covers the new affordance.** `npm test` in the producer checkout: `Test Suites: 19 passed, 19 total`, `Tests: 230 passed, 230 total`. `git status --short` unchanged by the run (only the pre-existing untracked `.flow/`). Tests exercising the new affordance: `src/lib/test/load-plugins.test.js` (`describe('registerPluginModule', ...)` at line 28, `describe('loadBuiltinPlugins', ...)` at line 124, including the "absent/undefined/empty is a no-op" case at line 125 and the missing-`npmName`/`module` throw cases at lines 143–154) and `src/test/app.test.js` (`describe('builtinPlugins registration', ...)` at line 357, `describe('builtinPlugins suppressed by skipCorePlugins: true', ...)` at line 411, `describe('builtinPlugins error-middleware ordering', ...)` at line 464).

**8b. Yalc snapshot — FAILS.** Checked `core-server`'s main checkout at `/Users/zane/playground/sdlcforge/core-server/.yalc/@liquid-labs/plugable-express/`:
- `package.json` reports version `1.0.0-alpha.58` (string-matches producer HEAD) and has an `mtime` of `Aug 24 19:13` (today, consistent with a recent `yalc push`).
- `dist/plugable-express.js` (the package's `"main"`, `package.json:5` — the file Node actually `require()`s) has an `mtime` of `Aug 16 14:37`, eight days stale relative to today's push.
- Content check settles it: grepping the packed bundle for `builtinPlugins` (any case) returns **zero matches**, and the distinguishing error string `"Each 'builtinPlugins' entry must define both 'npmName' and 'module'."` is **absent** — while the older, still-current `loadPlugin` error string `"does not export 'handlers' or 'setup'; bailing out."` **is present**, proving the bundle is a legitimate (unmangled-string) build and not corrupted, it is simply from before this feature existed.
- Located the minified `skipCorePlugins` guard directly in the bundle: `if(!0!==g&&(h.log(\`Loading core plugins from '${y}'...\`),await Bn(n,{cache:S,reporter:h,searchPath:y,explicitPlugins:c,loadedPluginNames:e,registerPathVar:Xe})),...)` — the guard goes straight to `loadPlugins` (`Bn`) with **no preceding `loadBuiltinPlugins` call and no `builtinPlugins` variable threaded anywhere in the bundle**.
- Root cause is visible in the producer checkout itself, not just the snapshot: `/Users/zane/playground/liquid-labs/plugable-express/dist/plugable-express.js` carries the same stale `Aug 16 14:30` mtime. The producer's own `prepack`/`make build` step (which `yalc push` is documented, in this repo's own `CLAUDE.md`, to run automatically before packing) was evidently not re-run since before the `builtinPlugins` merge — so the `yalc push` that touched `package.json`'s version/mtime today pushed a stale, pre-feature `dist/`.

**Verdict:** the mechanism has genuinely landed and is well-tested at the source level, but has **not** actually reached `core-server` via the yalc link — the packed artifact `core-server` will actually load at runtime lacks the feature entirely. Per this task's Purpose and scope and Validation section, this halts the phase. **Do not proceed to tasks 002/003 until `plugable-express` runs a real `make build` (or equivalent) and `yalc push` that produces a `dist/plugable-express.js` containing the `builtinPlugins` mechanism**, confirmed the same way this check did (grep the packed bundle for `builtinPlugins`, not just the `package.json` version string).

### Incidental finding (not a gate criterion, flagged for awareness)

`src/app.js` imports `WeakCache` from `@liquid-labs/weak-cache` (line 12) and `readFJSON` from `@liquid-labs/federated-json` (line 10) — both used in production code paths (`app.ext` cache construction, `local-settings.yaml` read) — but both packages are declared only in `plugable-express`'s `devDependencies`, not `dependencies` (`package.json:41,43` vs. `:48–64`). This is unrelated to the `builtinPlugins` mechanism and predates this plan's work, but is worth surfacing given task 002's planned `bun.lock` regeneration: a from-registry (non-yalc) install of `plugable-express` would not pull these two packages as transitive dependencies of a consumer.

### Re-dispatch outcome — 2026-08-24 — Outcome: succeeded — all eight requirements confirmed

This is a fresh dispatch, run after the manager fixed the stale-`dist/` root cause the prior attempt (above) correctly halted on. That prior attempt's blocked status stands as an accurate record of what it found at the time; this entry supersedes it with the current, passing state. Per this task's own worktree-discipline instruction, this update was authored and committed exclusively inside this task's own worktree (`/Users/zane/playground/sdlcforge/core-server/worktrees/plan/core-server-domain-consolidation-04-001`), not the plan worktree the prior attempt mistakenly wrote to.

Producer checkout re-verified unchanged from the prior pass: `/Users/zane/playground/liquid-labs/plugable-express`, branch `main`, `HEAD` still `a95c4cf0e12e98a6f15ae98930ed5659dc6c3013`, `package.json` version still `1.0.0-alpha.58`, `git status --short` showing only the pre-existing untracked `.flow/` (unchanged by this task, as required).

**Requirements 1, 2, 3, 4, 5, 6, 7 — independently re-confirmed against the same live source, same line numbers as the prior pass:**

1. Single `setup()` call site — re-confirmed. `src/lib/load-plugins.js`: `registerPluginModule` (lines 20–39) holds the sole `setup?.(...)` invocation (line 27); `loadPlugin` (lines 44–52) and `loadBuiltinPlugins` (lines 66–88) both resolve arguments and call `registerPluginModule` (lines 51 and 85). Package-wide grep (`grep -rn "setup?\.(\|setup(" src --include="*.js" --include="*.mjs"` excluding `/test/`) returns exactly one call-site hit: `load-plugins.js:27` (plus one unrelated jsdoc-prose mention at line 18 that is not a call site).
2. Setup argument object unchanged — re-confirmed. `load-plugins.js:27`: `setup?.({ app, cache, reporter, registerPathVar, serverConfigRoot : app.ext.serverConfigRoot })` — five members, same names.
3. `loadBuiltinPlugins` behavior — re-confirmed, `load-plugins.js:66–88`. No-ops on absent/empty `builtinPlugins` (line 67); throws `"Each 'builtinPlugins' entry must define both 'npmName' and 'module'."` when either is missing on an entry (lines 73–76, now guarded with an added `entry == null` null-check not present in the design note's sketch — a small, well-reasoned divergence per this task's own Assumptions section, not a gate failure); honors the shared `loadedPluginNames` set (lines 80–83, 86). No `supersededPlugins` reference, no `summary`/description regex, no `handlerPlugins` de-duplication logic anywhere in the function — confirmed absent by full read.
4. `app.js` call site placement — re-confirmed. `src/app.js:146–150`: `loadBuiltinPlugins(...)` at line 147, strictly inside `if (skipCorePlugins !== true)` (line 146) and strictly before `loadPlugins(...)` (line 150), threading the same `cache`, `reporter`, `registerPathVar`, and `loadedPluginNames` (the `Set` at line 144).
5. Four-stage sequence intact — re-confirmed. `pendingHandlers` drain: lines 166–168. Two error-handling `app.use(...)` layers: lines 171–226. `DependencyRunner` over `app.ext.setupMethods`: lines 230–235. `apiSpecPath` `fs.writeFile`: lines 237–241. Order and adjacency unchanged.
6. Reload path — re-confirmed. `app.reload` (lines 129–132) re-invokes `appInit(Object.assign({}, initArgs, { app }))`; `builtinPlugins` is destructured from `initArgs` at line 53, so it survives a reload unchanged. `clearRegistry()` runs at line 66, before any plugin loading (builtins begin at line 147).
7. Public surface unchanged — re-confirmed. `src/index.js:1–6` exports exactly `{ appInit, IntegrationsManager, Reporter, startServer }` — no `loadBuiltinPlugins`. `src/lib/index.js` (the internal lib index, `export * from './load-plugins'` among others) does re-export it, consistent with the requirement.

**Requirement 8 — now fully confirmed, both halves:**

- **8a. Test suite green, including the new-affordance coverage.** `npm test` in the producer checkout: `Test Suites: 19 passed, 19 total`, `Tests: 230 passed, 230 total`. `git status --short` unchanged by the run (only the pre-existing untracked `.flow/`). New-affordance tests confirmed present: `src/lib/test/load-plugins.test.js` — `describe('registerPluginModule', ...)` at line 28, `describe('loadBuiltinPlugins', ...)` at line 124. `src/test/app.test.js` — `describe('builtinPlugins registration', ...)` at line 357, `describe('builtinPlugins suppressed by skipCorePlugins: true', ...)` at line 411, `describe('builtinPlugins error-middleware ordering', ...)` at line 464.
- **8b. Yalc snapshot — now PASSES (the gate this task previously blocked on).** Independently re-verified, not taken on the manager's account:
  - Producer `dist/plugable-express.js`: mtime `Aug 24 19:19` (fresh — was `Aug 16 14:30` at the prior blocked attempt).
  - `core-server`'s `.yalc/@liquid-labs/plugable-express/`: `package.json` version `1.0.0-alpha.58` (mtime `Aug 24 19:19`); `dist/plugable-express.js` mtime `Aug 24 19:19` (matches — was stale at `Aug 16 14:37` before).
  - Content check: `grep -ic "builtinplugins" .yalc/@liquid-labs/plugable-express/dist/plugable-express.js` → **4** matches (was 0). `grep -c "Each 'builtinPlugins' entry must define both" .yalc/@liquid-labs/plugable-express/dist/plugable-express.js` → **1** match (the distinguishing new-affordance error string, present). The pre-existing `"does not export 'handlers' or 'setup'; bailing out."` string is also present (1 match), confirming the bundle is a legitimate unmangled build, not corrupted.
  - Byte-level cross-check beyond grep: `shasum -a 256` of the producer's own `/Users/zane/playground/liquid-labs/plugable-express/dist/plugable-express.js` and `core-server`'s `.yalc/@liquid-labs/plugable-express/dist/plugable-express.js` are **identical** — the yalc snapshot is not merely "contains the string" but a byte-for-byte copy of the producer's current, fresh build.
  - `core-server`'s `package.json` (line 49) and `bun.lock` (lines 16, 372) both resolve `@liquid-labs/plugable-express` via `file:.yalc/@liquid-labs/plugable-express` — the file path this check inspected is the one Bun will actually install from.

**Verdict: gate passes in full.** `plugable-express` commit SHA `a95c4cf0e12e98a6f15ae98930ed5659dc6c3013`, version `1.0.0-alpha.58`, `dist/plugable-express.js` fresh as of `2026-08-24 19:19` and byte-identical between producer and `core-server`'s `.yalc/` snapshot. Tasks 002 and 003 may proceed against this same snapshot without re-deriving these findings. `git status` in both repositories (`plugable-express` producer checkout and `core-server` main checkout) is unchanged by this task — each shows only pre-existing untracked scaffolding (`.flow/`, and in `core-server`'s case also the pre-existing untracked `.mcp.json` and `worktrees/`), no tracked-file changes.

The incidental finding above (untracked `devDependencies` for `WeakCache`/`readFJSON`) was not re-investigated in this pass since it is orthogonal to requirement 8 and was already fully recorded; it remains flagged for task 002's `bun.lock` regeneration awareness.

## References

- [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#mechanism-design-research-pass) — the full mechanism design, including the exact proposed source for `registerPluginModule`, `loadBuiltinPlugins`, and the four `app.js` edits, plus the decisive answers to all six formerly-open sub-questions.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/load-plugins.js` and `src/app.js` — the two files this gate reads.
- `/Users/zane/playground/liquid-labs/liq-controls/worktrees/plan/core-server-domain-consolidation/plan/phase-02-retire-liq-controls/001-verify-core-server-absorption.md` — the precedent this gate's shape follows, in the opposite direction.
