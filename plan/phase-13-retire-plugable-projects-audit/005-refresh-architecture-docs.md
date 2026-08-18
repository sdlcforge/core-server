# Refresh Dev-Core Architecture Docs For All Four Submodules

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`), not in `plugable-projects-audit` — the cross-repository task pattern already established elsewhere in this plan-group (e.g. `liq-projects` phase 1 task 001, phase 2 task 002).

This is a closing task for the whole `dev-core-consolidation` plan-group, added by the manager after all five participant slices (`liq-projects`, `liq-orgs`, `liq-work`, `liq-projects-lib`, `plugable-projects-audit`) had been planned and their cumulative shape was visible.

**The gap this task closes:** `liq-projects` phase 4 task `001-update-architecture-docs.md` authors `docs/architecture.md` for `@sdlcforge/dev-core`, correctly instructed to "describe accurately for the state at the time of writing, not aspirationally." But that task is scheduled right after `liq-projects` phases 1–3 (dev-core's foundation plus the `projects` submodule) — before `liq-orgs`, `liq-work`, and `plugable-projects-audit` have landed their own absorptions. If the plan-group's tasks execute roughly in phase order, dev-core's architecture doc will describe only one of its eventual four submodules as landed, and nothing in any of the other four slices' plans revisits it. This task is that revisit — the final absorption's own retirement phase is the natural place for a last "does the doc match reality" pass, since by the time this phase runs, either all four submodules have landed or the plan-group's actual execution order will have made that visible.

## Requirements

1. **Read the current state of `docs/architecture.md`** in dev-core (authored by `liq-projects` phase 4 task 001, and possibly already touched by this task's own prior partial runs). Read it fully before changing anything.
2. **Determine which submodules have actually landed** by inspecting `src/` in dev-core directly: `src/projects/`, `src/orgs/`, `src/work/`, `src/projects-audit/`. Do not infer landed state from any plan document — the plan's own phase order is not a reliable proxy for actual execution order (tasks may be dispatched out of phase order, or some may still be pending). Ground truth is the dev-core working tree itself.
3. **If all four submodules are present and wired into `src/index.mjs`'s aggregator:** update `docs/architecture.md` to describe the complete, four-submodule composition accurately — the full layout, the full composite `setup` order (`projects` → `orgs` → `work`, `projects-audit` has none), the full merged `handlers` count, and the complete `app.ext` contract surface (`_liqProjects`, `_liqOrgs`, `constants.WORK_DB_PATH`, `setupMethods`). Remove any "as of this phase, only X has landed" caveat language `liq-projects` phase 4 task 001 may have left in place.
4. **If one or more submodules are still absent** (this task's own dispatch happened to run before every absorption landed): update the document's caveat language so it accurately states which submodules are landed and which are still pending, rather than leaving stale language from an earlier partial state or silently claiming completeness that doesn't exist. Do not block on the missing submodules — this task's job is documentation accuracy for the state that actually exists when it runs, not a gate on the other slices' completion. Note in the report which submodules were present and which were not, so the manager can decide whether to re-dispatch this task later.
5. **Also review dev-core's `README.md`** for the same staleness risk (it too may have been authored/extended incrementally by each absorption task) and correct any submodule-count or capability claim that doesn't match the actual `src/` contents.
6. **Do not modify anything under `src/`, `package.json`, or any other non-documentation file.** This is a documentation-accuracy task only.

## Validation

- `docs/architecture.md`'s stated submodule count and list matches `ls src/ | grep -v index.mjs` exactly (adjusting for whichever submodules are actually present at the time this task runs, per requirement 4).
- No sentence in `docs/architecture.md` or `README.md` claims a submodule is present that is not actually in `src/`, and no sentence claims a submodule is absent that is actually present.
- `git status --short` in dev-core shows only documentation files changed (`docs/architecture.md`, and `README.md` if requirement 5 found a correction needed).
- If all four submodules were found present, the document reads as a description of the finished package, with no residual "as of phase N" framing.

## Metadata

architectural_impact: true

## Assumptions

- **Cross-repository commit mechanics**, identical to every other dev-core-executing task in this plan-group: work on a dedicated `task/<slug>` branch in dev-core, commit there, and report the branch and commit SHA — merging is a manager/user step. If a git operation there is refused by the environment's agent-scope guard, halt and report the exact command rather than working around it.
- This task may run before all four absorptions have landed, depending on actual dispatch order across the five participant repos (the plan-group's phase numbers establish a *logical* dependency order, not a guaranteed dispatch order across repos). Requirement 4 covers that case explicitly — this is not a failure condition, just a state to report accurately.
- `liq-projects` phase 4 task 001 has already run (dev-core has a `docs/architecture.md` to refresh). If it has not, halt and report — there is nothing to refresh yet, and this task should not author the document from scratch (that is task 001's job).

## References

- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/phase-04-doc-updates/001-update-architecture-docs.md` — the task that first authors this document.
- `/Users/zane/playground/liquid-labs/liq-projects/worktrees/plan/dev-core-consolidation/plan/notes/dev-core-target-shape.md` — decisions D2 (layout), D6/D7 (setup ordering), D8 (`app.ext` contract freeze).
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — the standing reference this document should stay consistent with.

## Checkpoint hints

- After confirming, from `src/` directly, which submodules are actually present.
- After `docs/architecture.md` is corrected to match that ground truth.
- After the `README.md` staleness check.
