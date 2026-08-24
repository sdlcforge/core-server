# Author README As Superseded Notice

## Purpose and scope

Rewrite `liq-controls`'s `README.md` as its final-release superseded notice, per the source-package retirement policy in `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy`. Depends on [`001-verify-core-server-absorption.md`](./001-verify-core-server-absorption.md) having passed.

**Correction (post-authoring update):** a `README.md` and `docs/liq-controls-spec.md` now exist and are committed to `main` (authored via `gather-project-definition`/`dispatch-doc-author` ahead of this plan-group's own planning pass, so the fold could be scoped against real documentation instead of an undocumented codebase). They document `liq-controls` as the current, standalone, active plugin — accurate as of authoring, but by the time this task executes, `core-server` will have absorbed the functionality they describe. This task **rewrites** the existing `README.md` in place (not from-scratch authoring) to replace that standalone framing with the supersession notice below; `docs/liq-controls-spec.md` may be left as historical record or updated at the task executor's discretion, but is not this task's primary deliverable.

## Requirements

Rewrite `README.md` covering:

1. **Supersession banner**, leading the document: `liq-controls` is superseded by `@sdlcforge/core-server`, which now carries its functionality directly (not by a generic "policy" framework layer — the wave manifest's own description records that no generic policy concept exists in the framework to fold into instead, so this absorption is domain-specific, not a framework-level fold-in like `framework-consolidation`'s).
2. **An accurate statement of what the package did**: question-based policy controls, loaded per organization at server setup from `data/org/controls/*.qcontrols.yaml`, exposed via two HTTP endpoints and the `getQuestionControls` integration hook. Cross-check against both [`plan/notes/liq-controls-source-inventory.md`](../notes/liq-controls-source-inventory.md) and the committed `docs/liq-controls-spec.md` (now part of this repository's history — read it, don't assume it absent).
3. **Honest consumer inventory.** State plainly that the only npm dependent, confirmed by a playground-wide grep at plan-authoring time, was `@sdlcforge/core-server`.
4. **Migration pointer.** Point readers at `@sdlcforge/core-server` for current functionality; do not include installation/usage instructions for `liq-controls` itself as if it were still standalone-installable guidance (it no longer is, once this notice is authored).
5. **Known-defect disclosure**, carried forward from the source inventory, not fixed: (a) the `mdFormatter`/`textFormatter`/`terminalFormatter` `data?.lengeth` typo that leaves Markdown/text/terminal-formatted list output always empty; (b) the "No such or  g" 404 error-message typo; (c) no load-time schema validation against `src/schema/audit.schema.json` (now `src/controls/schema/audit.schema.json`).
6. **Final version number**, matching whatever `003-mark-package-deprecated-and-bump-version.md` sets `package.json`'s `version` to — coordinate rather than guess a number independently (read that task's own requirement, or the already-landed `package.json` if task 003 ran first; tasks 002 and 003 are parallel-eligible per `plan/overview.md`, so either order is possible — do not hardcode a version number here without checking).
7. **No re-export shim disclaimer is needed** (none exists — Phase 1 left a thin re-export only within `liq-controls`'s own build entry point, not a shim registered with any live server), but do briefly note that the repository's own source is left intact (not deleted), per policy.

## Validation

- `README.md` exists at the repository root and its content reflects the supersession notice (not the pre-fold standalone-plugin framing it carried before this task ran).
- The supersession banner names `@sdlcforge/core-server` and appears at or near the top of the document.
- All three disclosed defects are present, each traceable to the specific file/behavior named in the source inventory.
- The consumer inventory statement matches the source inventory's own finding (single dependent: `core-server`) — do not silently broaden or narrow this claim without a fresh grep confirming it still holds as of this task's execution (a new dependent could plausibly have appeared between plan-authoring and this task's execution, given the phase-1-to-phase-2 gate delay).
- `make lint`/`make qa` remain green (README changes should not affect these, but confirm rather than assume).
- No other file is modified by this task.

## References

- [`plan/notes/liq-controls-source-inventory.md`](../notes/liq-controls-source-inventory.md) — source of the route surface, defect list, and consumer inventory this README restates.
- `liq-orgs`'s own `002-author-readme-superseded-notice.md` outcome, recorded in its `plan/plan-summary-dev-core-consolidation.md` (`/Users/zane/playground/liquid-labs/liq-orgs/plan/`) — the precedent this task's shape follows (superseded banner, first-ever accurate description, consumer inventory, known-defect disclosure).
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#source-package-retirement-policy` — the retirement policy this README implements the documentation half of.
