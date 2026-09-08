# Update Project Onboarding Docs

## Purpose and scope

Bring `@sdlcforge/core-server`'s top-level onboarding documents — `README.md`, `AGENTS.md`, `CLAUDE.md` — in line with the changes this plan lands: `@sdlcforge/dev-core` ceases to exist as a separate npm plugin package, its four submodules become in-tree components, the built-in plugin aggregate goes from three components to seven, and the explicit-plugin tier drops from five packages to four.

This task also owns the documentation substance that Phase 2's merge deliberately deferred: dev-core's own `README.md` conflicted with `core-server`'s during the absorption merge and was resolved `--ours`, with its per-submodule route tables and its "projects-audit → projects dependency" section handed forward to this task as source material for the merged `README.md`, rather than folded in at merge time.

Architecture and specification documents (`docs/architecture.md`, `docs/core-server-spec.md`, `docs/architecture/plugin-loading-tiers.md`, `docs/project-structure.md`) and the disposition of `docs/dev-core-consolidation-contract.md`/`docs/consumer-migration.md` are [`001-update-architecture-docs.md`](./001-update-architecture-docs.md)'s scope, not this task's. That task is parallel-eligible with this one — both derive their facts from `plan/overview.md` and the completed Phase 1–5 task docs, not from each other's edits. Where this task states a fact also stated in `docs/architecture.md` (the seven-component list and its declared order, in particular), state it consistently with that document; consult [`plan/notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md) directly as the shared source of truth if the two tasks' outputs are not both available for cross-checking at execution time.

No dedicated skill covers updating `README.md`/`AGENTS.md`/`CLAUDE.md` prose in place; follow the [Procedure](#procedure) below, which mirrors [`update-architecture-docs`](flow-mcp:d)'s stale-section-identification discipline (edit only what changed, preserve accurate content and voice, no invented restructuring) applied to these three files.

## Requirements

`role_doc: plugins/flow/roles/tech-writer.md`

1. **`README.md`.** Update the package description and any plugin/route inventory to reflect seven in-tree built-in components and four explicit npm-dependency plugins (the `@liquid-labs/sdlc-projects-*` family). Fold in dev-core's `README.md` (resolved `--ours` at the Phase 2 merge — its content is not directly reachable in the post-merge tree) per-submodule route tables and its "projects-audit → projects dependency" note as source material; this content does not currently exist in `core-server`'s own `README.md` and needs to be authored fresh, not merely edited in place. Retrieve dev-core's pre-merge `README.md` via `git show <dev-core-pre-merge-commit>:README.md` if it is not otherwise available at task execution time — the pre-merge commit is recorded in [`plan/notes/merge-arrival-inventory.md`](../notes/merge-arrival-inventory.md).
2. **`AGENTS.md`.** Update the built-in plugin list (currently naming exactly `src/controls/`, `src/credentials/`, `src/integrations-issues-github/`) to the full seven, the explicit-plugin list (currently naming `dev-core` alongside the `sdlc-projects-*` family) to drop `dev-core` and name four packages, the key-source-files list, and the lint/test conventions the new root `.eslintrc.cjs` and Phase 5's `src/lib/test/component-boundary.test.js` drift-guard add.
3. **`CLAUDE.md`.** Apply the same substantive updates as `AGENTS.md` above. This repository maintains both files with materially overlapping content today; verify at task execution time whether they have diverged further than that overlap and update each to its own accurate state rather than assuming they must stay identical.

## Validation

1. All three files (`README.md`, `AGENTS.md`, `CLAUDE.md`) have been read and updated, or a specific unchanged section is explicitly recorded as reviewed-and-correct in the task report.
2. `grep -rn '@sdlcforge/dev-core' README.md AGENTS.md CLAUDE.md` returns only deliberate historical references (a migration note, a changelog-style mention), never a live statement that the package is a current dependency or explicit plugin.
3. `grep -rniE 'three (built-?in|in-tree|component)' README.md AGENTS.md CLAUDE.md` returns nothing, and no enumeration of the built-in aggregate in any of the three files lists only `controls`, `credentials`, and `integrations-issues-github`.
4. All seven built-in components are named, in the declared order, everywhere the three files enumerate the built-in aggregate, and that order matches `docs/architecture.md`'s.
5. The explicit-plugin tier is described as four `@liquid-labs/sdlc-projects-*` packages everywhere it is enumerated across the three files.
6. `README.md` names each absorbed submodule's route surface, or explicitly states where the full route inventory lives instead (e.g. `docs/core-server-spec.md`), if a literal route table is judged not to belong in `README.md`. Record which choice was made and why in the task report.
7. `make lint`'s finding set is unchanged by this task (no code change was made) — **correction (2026-09-08): the standing baseline is 231, not 233** (Phase 4 task 004 cleared 2 of the original 3 `src/` findings; see `plan/resources/dev-core-absorption-parity-verification.md`). `make lint` is never literally "green" — the bar is zero *new* findings, reproduced against 231.

## Procedure

1. Read `plan/overview.md` in full for the plan's scope and the seven-component facts.
2. Read [`plan/notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md) for the exact DAG order and component names, to state consistently with `001-update-architecture-docs.md`.
3. Read `README.md`, `AGENTS.md`, `CLAUDE.md` in full as they exist at task execution time.
4. Retrieve dev-core's pre-merge `README.md` per Requirements point 1 and identify the still-relevant per-submodule route tables and dependency note.
5. Edit each of the three files in place: update only sections whose claims are now stale, preserving accurate content, voice, and structure elsewhere.
6. Run the Validation checks above and record the results in the task report.

## Metadata

architectural_impact: false

## References

- [`plan/overview.md`](../overview.md) — the plan's scope, what must not change, and the success criteria these docs must end up consistent with.
- [`plan/notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md) — the seven-component DAG order and names, to state consistently with `001-update-architecture-docs.md`.
- [`plan/notes/merge-arrival-inventory.md`](../notes/merge-arrival-inventory.md) — records dev-core's `README.md` conflict resolution and the recommendation to fold its route tables forward into this task.
- [`001-update-architecture-docs.md`](./001-update-architecture-docs.md) — the sibling, parallel-eligible task covering `docs/architecture.md`, `docs/core-server-spec.md`, `docs/architecture/plugin-loading-tiers.md`, `docs/project-structure.md`, and the `docs/dev-core-consolidation-contract.md`/`docs/consumer-migration.md` disposition decisions.
