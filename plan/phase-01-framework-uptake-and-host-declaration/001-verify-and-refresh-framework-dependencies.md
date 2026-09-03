# Verify And Refresh Framework Dependencies

## Purpose and scope

Refresh `core-server`'s two stale local `.yalc`-linked dependencies — `@liquid-labs/plugable-express` and `@sdlcforge/dev-core` — and empirically verify the refresh actually landed, before any other task in this plan authors a declaration against APIs or manifests that may not really be present. This is the prerequisite-verification task the plan's `overview.md` and this phase's own summary ([`plan/phases/framework-uptake-and-host-declaration.md`](../phases/framework-uptake-and-host-declaration.md)) both call for. **This task authors no `plugable.host` block and no capability declarations** — that is [002](./002-declare-plugable-host-block.md)'s and Phase 2's scope; this task's only job is making the ground truth real.

**Why two packages, not one.** As of the 2026-08-26 grounding pass only `plugable-express` was known stale. A 2026-09-01 re-verification ([`plan/notes/2026-09-01-blocker-reverification.md`](../notes/2026-09-01-blocker-reverification.md)) found a second, independently stale dependency: `@sdlcforge/dev-core` — one of `core-server`'s real `explicitPlugins` entries since the sibling `dev-core-consolidation` plan-group landed — shipped its own `package.json` `"plugable"` component manifest on 2026-09-01, but `core-server`'s local `.yalc/@sdlcforge/dev-core/` snapshot predates that merge (dated 2026-08-27) and carries no `"plugable"` key at all. Both packages must be refreshed together; refreshing only one leaves the other's absence to surface later as a confusing, unrelated-looking failure.

## Requirements

1. **Confirm environment access.** This task pushes from two sibling repositories on the same machine, not just from within `core-server`'s own checkout/worktree:
   - `/Users/zane/playground/liquid-labs/plugable-express` (already built and published at `v1.0.0-alpha.59` — no further work needed there beyond `yalc push`).
   - `/Users/zane/playground/sdlcforge/dev-core` (its `"plugable"` manifest already merged to `main` — no further work needed there beyond `yalc push`).

   If the execution environment cannot reach these absolute paths (e.g. a sandboxed or single-repo-scoped worktree), **halt and report** rather than attempting a workaround — this task's entire mechanism depends on producer-side access.

2. **Push both packages.**
   ```bash
   cd /Users/zane/playground/liquid-labs/plugable-express && yalc push
   cd /Users/zane/playground/sdlcforge/dev-core && yalc push
   ```
   Each `yalc push` runs that package's own `prepack` (`make build`) first, so the pushed snapshot is freshly built — no separate build step is needed in either producer repo. `yalc push` also auto-pushes into every consumer directory already registered via a prior `yalc add` — `core-server`'s **main checkout** (`/Users/zane/playground/sdlcforge/core-server`, not necessarily this task's own worktree) already carries `.yalc/@liquid-labs/plugable-express/` and `.yalc/@sdlcforge/dev-core/`, so it is such a registered consumer for both.

3. **Confirm the main checkout actually received the push**, before relying on it for worktree provisioning:
   ```bash
   node -e "console.log(require('/Users/zane/playground/sdlcforge/core-server/.yalc/@liquid-labs/plugable-express/package.json').version)"
   # expect 1.0.0-alpha.59, not 1.0.0-alpha.58
   grep -q '"plugable"' /Users/zane/playground/sdlcforge/core-server/.yalc/@sdlcforge/dev-core/package.json && echo "dev-core manifest present in main checkout .yalc/"
   ```
   If either check fails, the auto-push did not reach the main checkout (e.g. the consumer registration lapsed); re-run `yalc add <package>` from the main checkout for the affected package(s) and re-verify before continuing.

4. **Provision this task's own worktree, refreshing rather than trusting a stale copy.** `scripts/provision-local-deps.sh` only copies `.yalc/` in from the main checkout when the *current* directory has no `.yalc/` at all — if this worktree already has one (e.g. from an earlier provisioning pass, before the push in step 2), the script leaves it as-is and the fresh content never arrives. Check for that case explicitly:
   ```bash
   # If .yalc/ already exists in this worktree, remove it so the script re-copies fresh content
   # from the (now-updated) main checkout rather than silently keeping a stale copy.
   rm -rf .yalc
   ./scripts/provision-local-deps.sh --refresh-lock
   ```
   `--refresh-lock` is mandatory here, not optional — see `AGENTS.md`/`CLAUDE.md`'s documented Bun behavior: once `bun.lock` holds a resolved `file:` entry, a bare `bun install` re-copies a linked package's content without re-resolving its own dependency list, so a newly added transitive dependency would silently never materialize while `bun install` reports success.

5. **Verify uptake rather than assuming it**, for both packages:
   ```bash
   test -x node_modules/.bin/plugable-express-validate && echo "CLI present"
   node -e "const m = require('@liquid-labs/plugable-express'); \
     console.log('validatePluginSet' in m, 'verifyHostDeclaration' in m)"
   # expect: CLI present / true true
   grep -q '"plugable"' node_modules/@sdlcforge/dev-core/package.json && echo "dev-core manifest present"
   ```
   If any of these three checks fails, **halt and report** — do not proceed to Phase 1's remaining tasks (or any later phase) against an unverified or partially-refreshed dependency set.

6. **Reconcile `scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` list against `bun.lock`.** As of this writing the list already names both `@liquid-labs/plugable-express` and `@sdlcforge/dev-core` (it was updated when the dev-core consolidation landed), so no edit is expected — but confirm with `grep -n 'file:\.yalc' bun.lock` and update the script in this same task if the resolved set has actually changed.

7. **Confirm the build still succeeds**: `bun run build`.

8. **Commit the regenerated `bun.lock`.** Unlike `.yalc/` (gitignored), `bun.lock` is git-tracked in this repository — the refreshed lockfile from step 4 is a real, expected diff and must be committed as part of this task's change, not discarded.

## Validation

- `node_modules/.bin/plugable-express-validate` exists and is executable.
- `node -e "const m = require('@liquid-labs/plugable-express'); console.log('validatePluginSet' in m, 'verifyHostDeclaration' in m)"` prints `true true`.
- `grep -q '"plugable"' node_modules/@sdlcforge/dev-core/package.json` succeeds.
- `bun run build` completes without error.
- `git diff --stat` shows `bun.lock` changed (and, if applicable, `scripts/provision-local-deps.sh`); no other files are touched by this task.
- `git log`/`git diff` confirms no source file under `src/` was modified — this task is dependency plumbing only.

## Assumptions

- The upstream deliverables themselves are already complete and require no further work in their own repositories: `@liquid-labs/plugable-express` is merged, tagged `v1.0.0-alpha.59`, and published; `@sdlcforge/dev-core`'s `"plugable"` manifest is merged to its `main` branch. This task's only job is the local push-and-reinstall-and-verify sequence, not any upstream authoring.
- This task's execution environment has filesystem access to `/Users/zane/playground/liquid-labs/plugable-express` and `/Users/zane/playground/sdlcforge/dev-core` at those absolute paths. If not, halt and report per Requirement 1.
- This task runs before any other task in this plan. Every later task (this phase's [002](./002-declare-plugable-host-block.md) and [003](./003-add-host-declaration-drift-guard.md), and every task in Phases 2-4) depends on its outcome.

## References

- [`plan/notes/2026-09-01-blocker-reverification.md`](../notes/2026-09-01-blocker-reverification.md) — the finding that this is now a two-package refresh, with the exact command sequence this task follows.
- [`plan/notes/build-wiring-and-dependency-refresh.md`](../notes/build-wiring-and-dependency-refresh.md) — the dependency-refresh rule, the two packages' respective failure symptoms if skipped, and the task-worktree provisioning convention (updated for the two-package scope alongside this task).
- [`plan/notes/upstream-framework-readiness.md`](../notes/upstream-framework-readiness.md) — the original (now-superseded for delivery status, still accurate for the API surface) readiness analysis for `@liquid-labs/plugable-express`.
- `scripts/provision-local-deps.sh` — the provisioning script this task runs against its own worktree, including the "already-present `.yalc/` is left as-is" behavior this task must account for.
- `AGENTS.md` / `CLAUDE.md` — the project's documented yalc/Bun refresh rule.

## Status

**Outcome:** succeeded (2026-09-02).

This is a retry of a prior attempt that halted at Requirement 5's third check because `node_modules/@sdlcforge/dev-core` did not exist at all in that attempt's worktree — root-caused to the plan branch having been cut before the `dev-core-migration` plan-group merged into `main`. The manager subsequently merged `main` forward into the plan branch and re-cut this task's worktree. Re-verified as part of Requirement 1's environment check, ahead of this run: `package.json` in this worktree lists `@sdlcforge/dev-core: file:.yalc/@sdlcforge/dev-core` as a dependency, and `src/lib/app-init.mjs` line 57 references `'@sdlcforge/dev-core'` in its explicit-plugins list — the fix is confirmed real.

All requirements executed fresh, in order, from this brand-new worktree:

- Requirement 1: confirmed filesystem access to both sibling repos (`/Users/zane/playground/liquid-labs/plugable-express`, `/Users/zane/playground/sdlcforge/dev-core`).
- Requirement 2: ran `yalc push` in both sibling repos. `plugable-express` published `1.0.0-alpha.59` and auto-pushed into the main checkout's `node_modules`; `dev-core` published `1.0.0-alpha.0` and auto-linked likewise.
- Requirement 3: confirmed the main checkout's `.yalc/` received both pushes — `plugable-express` version reads `1.0.0-alpha.59`, and `dev-core`'s `package.json` carries a `"plugable"` key.
- Requirement 4: this fresh task worktree had no pre-existing `.yalc/`, so the "stale copy left as-is" hazard did not apply; ran `rm -rf .yalc && ./scripts/provision-local-deps.sh --refresh-lock` regardless, which copied `.yalc/` from the (now-updated) main checkout, dropped `bun.lock`, and reinstalled (882 packages).
- Requirement 5: all three uptake checks passed — `node_modules/.bin/plugable-express-validate` is present and executable; `require('@liquid-labs/plugable-express')` exposes both `validatePluginSet` and `verifyHostDeclaration`; `node_modules/@sdlcforge/dev-core/package.json` carries a `"plugable"` key. This is the exact check that failed in the prior attempt — now green.
- Requirement 6: `scripts/provision-local-deps.sh`'s `REQUIRED_YALC_PACKAGES` already names both packages, and `bun.lock` resolves exactly those same two `file:.yalc/...` entries — no script edit was needed.
- Requirement 7: `bun run build` completed without error (both rollup bundles built successfully).
- Requirement 8: `bun.lock` is the only tracked file changed in this worktree (`git diff --stat`: 1 file, 34 insertions/34 deletions); `dist/` is gitignored and not part of the diff. No file under `src/` was touched.

Validation: all six checks in `## Validation` passed (see the implementation report's `validation_results` for the exact commands and output).

Affected files: `bun.lock` (regenerated lockfile), this task document (`## Status` addition). No source files under `src/` were modified.
