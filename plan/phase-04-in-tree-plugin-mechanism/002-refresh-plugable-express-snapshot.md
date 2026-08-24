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
