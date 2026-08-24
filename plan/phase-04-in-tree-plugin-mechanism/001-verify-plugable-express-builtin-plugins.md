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

## References

- [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#mechanism-design-research-pass) — the full mechanism design, including the exact proposed source for `registerPluginModule`, `loadBuiltinPlugins`, and the four `app.js` edits, plus the decisive answers to all six formerly-open sub-questions.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/load-plugins.js` and `src/app.js` — the two files this gate reads.
- `/Users/zane/playground/liquid-labs/liq-controls/worktrees/plan/core-server-domain-consolidation/plan/phase-02-retire-liq-controls/001-verify-core-server-absorption.md` — the precedent this gate's shape follows, in the opposite direction.
