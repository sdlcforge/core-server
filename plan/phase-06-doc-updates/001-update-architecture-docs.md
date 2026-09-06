# Update Architecture Docs

## Purpose and scope

Bring `@sdlcforge/core-server`'s architecture and specification documents in line with the changes this plan lands: `@sdlcforge/dev-core` ceases to exist as a separate npm plugin package, its four submodules become in-tree components, the built-in plugin aggregate goes from three components to seven in a deliberate DAG order, and a new mechanically-enforced component boundary replaces the package boundary that used to separate them.

This task also owns the documentation substance that Phase 2's merge deliberately deferred: dev-core's `docs/architecture.md` conflicted with `core-server`'s during the absorption merge and was resolved `--ours`, with its still-relevant content handed forward to this task rather than folded in at merge time. It also settles the disposition of two arrivals Phase 2 kept without deciding: `docs/dev-core-consolidation-contract.md` and `docs/consumer-migration.md`.

Project onboarding docs — `README.md`, `AGENTS.md`, `CLAUDE.md` — are [`002-update-project-onboarding-docs.md`](./002-update-project-onboarding-docs.md)'s scope, not this task's. That task is parallel-eligible with this one: both derive their facts from `plan/overview.md` and the completed Phase 1–5 task docs, not from each other's edits.

Follow the [`update-architecture-docs`](flow-mcp:d) task-procedure at `plugins/flow/task-procedures/update-architecture-docs/SKILL.md`.

## Requirements

`role_doc: plugins/flow/roles/architect-backend.md`

The implications are component-boundary, plugin-loading-topology, and package-composition changes to a backend HTTP server — backend/API/component in nature, with no data-model, cloud-topology, or frontend dimension.

### Where the architectural implications came from

Task documents for Phases 1 through 5 are authored by per-phase `phase-decomposition` instances running concurrently with this one, and not all exist yet at the time this document was written. The implications originate in the following phase scopes, whose task documents live under the correspondingly-numbered directories and must be complete by the time this task actually runs:

- `plan/phases/absorb-dev-core.md` → `plan/phase-02-absorb-dev-core/` — the git-history-preserving merge; `src/{projects,orgs,work,projects-audit}/` enter the tree; dev-core's package-level artifacts are removed; the runtime dependency set goes from 22 to 32 entries.
- `plan/phases/wire-and-declare-seven-components.md` → `plan/phase-03-wire-and-declare-seven-components/` — **the primary source of architectural change.** `src/lib/builtin-plugins.mjs` aggregates seven components in DAG order; `package.json`'s `plugable.host.builtins[0].components` declares the same seven; `@sdlcforge/dev-core` leaves `explicitPlugins` and `dependencies`, taking the explicit-plugin tier from five packages to four.
- `plan/phases/verify-parity-and-tighten-gate.md` → `plan/phase-04-verify-parity-and-tighten-gate/` — route provenance moves for 112 routes (to 118 under `@sdlcforge/core-server`), the plugins list goes 6 → 5, and the plugin-graph gate's permanent error allowlist is deleted rather than trimmed.
- `plan/phases/component-boundary-hardening.md` → `plan/phase-05-component-boundary-hardening/` — a new enforced invariant: no component may import another; coupling is `app.ext` state and declared capabilities only, mechanically enforced by a root `.eslintrc.cjs` (`import/no-restricted-paths`) and guarded by `src/lib/test/component-boundary.test.js`.
- `plan/phases/pre-merge-baseline-and-drift-clearance.md` → `plan/phase-01-pre-merge-baseline-and-drift-clearance/` — no architectural change of its own; named for completeness because its parity contract is the record of what was and was not allowed to move.

**Before this task runs**, re-verify each `plan/phase-0N-<slug>/` path above actually exists and lists task documents. If a phase directory is still missing when this task is dispatched for execution, that is a `missing prerequisites` condition under the `update-architecture-docs` procedure's own error handling — halt and report rather than proceeding from the phase summaries alone.

### Files to review and update

Each file below must be read and updated where it is now wrong, stale, or silent about something a reader needs. A file that is already correct is left alone and recorded as reviewed.

- `docs/architecture.md` — the component decomposition, the plugin-loading topology, and the tier composition. Must describe seven in-tree components rather than three, the DAG order and what each position is load-bearing for, and the component-boundary invariant and how it is enforced. Fold in the still-relevant substance of dev-core's own `docs/architecture.md` (submodule decomposition, composite-`setup` ordering contract, `app.ext` service contracts) that arrived at the merge as a conflict resolved `--ours`.
- `docs/core-server-spec.md` — the project specification, discovered via the `docs/*-spec.md` glob (it is the only match). Any spec-level statement about what this package contains, what it depends on, or which routes it is responsible for.
- `docs/architecture/plugin-loading-tiers.md` — the tier model. The builtin tier grows to seven components and the explicit tier drops `@sdlcforge/dev-core`. Standing followup `yIza` records stale "expected to eventually supersede" framing in this file for this pass to consider.
- `docs/project-structure.md` — the `src/` layout: four new component directories as siblings of `src/lib/` and `src/cli/`, plus the new root `.eslintrc.cjs`. Standing followup `oY63` records that its `docs/` prose omits `docs/architecture.md`.

Standing followup `tonW` — `docs/architecture.md`'s test-infrastructure section omits the full-tier baseline — is also in range for this pass.

### Two dispositions this task must settle

Both are arrivals Phase 2 deliberately kept rather than deciding at merge time:

- `docs/dev-core-consolidation-contract.md` — the absorption recipe Phase 2 executed. Its durable substance (the component-boundary contract, the composite setup ordering, root-file ownership) loses its home when dev-core retires. Fold what survives into `docs/architecture.md`, then keep or remove the file deliberately.
- `docs/consumer-migration.md` — documents repointing away from the four superseded donor packages. Keep as history or remove; either is defensible, but the decision must be recorded rather than left to drift.

## Validation

1. Every file named under "Files to review and update" has been read, and each is either updated or explicitly recorded as reviewed-and-correct in the task report.
2. `grep -rn '@sdlcforge/dev-core' docs/` returns only deliberate historical references (a migration note, a changelog-style mention), never a live statement that the package is a current dependency or explicit plugin.
3. `grep -rniE 'three (built-?in|in-tree|component)' docs/` returns nothing, and no enumeration of the built-in aggregate anywhere in `docs/` lists only `controls`, `credentials`, and `integrations-issues-github`.
4. `docs/architecture.md` names all seven components, states the declared order, and states the no-cross-component-import invariant together with the mechanism that enforces it (`.eslintrc.cjs`'s `import/no-restricted-paths`, guarded by `src/lib/test/component-boundary.test.js`).
5. The explicit-plugin tier is described as four `@liquid-labs/sdlc-projects-*` packages everywhere it is enumerated in `docs/`.
6. `docs/dev-core-consolidation-contract.md` and `docs/consumer-migration.md` each have a recorded disposition. If either was removed, no surviving document links to it — following the Project Plan Document Standards' old-path verification convention, run a bare-filename, boundary-anchored sweep rather than a path-prefix one, and exclude historical `plan/plan-summary-*.md` records and `worktrees/` paths from the results:

   ```bash
   grep -rn --include='*.md' -E '(^|[/(])dev-core-consolidation-contract\.md' . | grep -v -E '(plan/plan-summary-|worktrees/)'
   grep -rn --include='*.md' -E '(^|[/(])consumer-migration\.md' . | grep -v -E '(plan/plan-summary-|worktrees/)'
   ```

   Both must return no non-historical hits for whichever file(s) were removed.
7. `make lint` is green against the standing 233-finding baseline; no code change was made by this task.

## Metadata

architectural_impact: true

## References

- [`plan/overview.md`](../overview.md) — the plan's scope, what must not change, and the success criteria these docs must end up consistent with.
- [`plan/notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md) — why the seven components are ordered as they are; the source for `docs/architecture.md`'s ordering rationale.
- [`plan/notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md) — the measured post-merge plugin graph; the source for any topology claim.
- [`plan/notes/eslint-component-boundary-rule.md`](../notes/eslint-component-boundary-rule.md) — the boundary rule and its enforcement mechanism, to describe accurately rather than approximately.
- [`plan/notes/merge-arrival-inventory.md`](../notes/merge-arrival-inventory.md) — records the measured `docs/architecture.md` merge conflict and the recommendation to disposition `docs/consumer-migration.md` and `docs/dev-core-consolidation-contract.md` in this documentation pass.
- [`plan/resources/absorption-parity-contract.md`](../resources/absorption-parity-contract.md) — Phase 1's parity contract, authoritative for what did and did not change observably.
- [`002-update-project-onboarding-docs.md`](./002-update-project-onboarding-docs.md) — the sibling, parallel-eligible task covering `README.md`, `AGENTS.md`, and `CLAUDE.md`.

## Checkpoint hints

- After updating `docs/architecture.md` (the largest single edit: seven-component decomposition, DAG order, boundary invariant, folded-in dev-core substance).
- After updating `docs/core-server-spec.md`, `docs/architecture/plugin-loading-tiers.md`, and `docs/project-structure.md`.
- After settling and recording both dispositions (`docs/dev-core-consolidation-contract.md`, `docs/consumer-migration.md`) and performing any resulting file removal.
