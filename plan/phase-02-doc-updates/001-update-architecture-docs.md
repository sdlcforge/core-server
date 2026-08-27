# Update Architecture Docs

## Purpose and scope

Review `core-server`'s architecture and specification documents against the state the Phase 1 tasks actually landed, and update whatever they still describe incorrectly.

This is a **conformance sweep**, not a second pass at Phase 1's enumerated edits. Phase 1 task 003 worked from a touch-point list; this task works from the documents themselves, asking whether each still describes the system truthfully now that four documented tier-2 components have collapsed into one.

That distinction earns its keep here rather than being ceremony. The migration's source specification — `dev-core`'s `docs/consumer-migration.md`, an unusually thorough per-donor edit table — **was already demonstrably incomplete against today's tree**: it omitted `docs/project-structure.md`, omitted `plugin-loading-tiers.md`'s prose about the in-tree `controls` submodule's dependency on the donor packages, and predated the entire `full-tier-baseline.test.js` snapshot suite whose checked-in JSON the migration moves in 112 places. An enumerated list missed all three. A read-the-document-and-check pass is what caught them.

## Requirements

### 1. Which Phase 1 task documents surfaced the architectural implications

These are the implementation tasks that will have completed by the time this phase runs. Read each, and the report each produced, before reviewing any architecture document:

- `plan/phase-01-dev-core-swap/002-swap-explicit-plugins-atomically.md` — flagged `architectural_impact: true`. Collapses four independently-versioned tier-2 plugin packages into one, and moves API-spec provenance across 112 route entries.
- `plan/phase-01-dev-core-swap/003-update-docs-and-stale-references.md` — flagged `architectural_impact: true`. Already edited both architecture documents named below; this task reviews that work rather than redoing it.
- `plan/phase-01-dev-core-swap/004-verify-migration.md` — its report records what the running server actually does post-swap, including which routes are present and which pre-existing defects reproduced. Where that observed reality and a document disagree, the observed reality wins.

### 2. Which architecture and spec files to review

- **`docs/architecture.md`** — the architecture overview. Confirm the Tier-2 depiction (Mermaid diagram, its alt description, the Plugin system prose, the Core initialization prose, and the Test infrastructure prose) describes a five-package explicit tier fronted by `@sdlcforge/dev-core`, with no surviving donor name and no surviving "8 packages" count. Confirm the Tech stack section's "Local dev loop: yalc" entry still names the right packages.
- **`docs/architecture/plugin-loading-tiers.md`** — the deep treatment, reached via the `docs/architecture/` subtree rather than a `docs/*-spec.md` glob. Confirm the explicit-tier table is five rows with one `@sdlcforge/dev-core` row, and that the in-tree-`controls` dependency paragraph describes `@sdlcforge/dev-core` as the single provider of both the `app.ext._liqOrgs.orgs` and `app.ext._liqProjects.playgroundMonitor` contracts, while still using those exact key names — they survive the consolidation unrenamed, and a doc that "modernizes" them away is actively misleading.
- **`docs/core-server-spec.md`** — the project specification, the single file matching the `docs/*-spec.md` glob. It names **no** donor package today; its plugin-tier language is generic and is expected to need no donor edit. Confirm that rather than assume it, and confirm its three-tier ordering and "all capability is plugin-delivered" claims still hold — they do, since this migration changes which package supplies the explicit tier, not the tier model.

Two things this task should **notice and report but not act on**:

- `docs/core-server-spec.md` and `docs/architecture.md` both state Node.js support across 18-24, and the Docker suite is described as validating that range. This host runs v26.5.0, and the migration spec discloses a pre-existing `SlowBuffer` load failure on Node ≥ 24 that `dev-core` inherits. That is a real documentation-versus-reality gap, but it predates this plan-group and is explicitly out of its scope.
- `docs/architecture.md`'s Test infrastructure section describes three test levels and does not mention the `full-tier-baseline.test.js` characterization harness or its checked-in snapshots, which a later plan added. Whether that belongs in the architecture doc is a judgment call worth raising; making it is not this task's mandate.

### 3. Procedure

Follow the `update-architecture-docs` task procedure at `plugins/flow/task-procedures/update-architecture-docs/SKILL.md`.

```text
role_doc: plugins/flow/roles/architect-backend.md
```

`architect-backend` is the right variant: the implications are component-composition and API-provenance changes within the server's plugin layer — not data-model, cloud/deployment, or frontend concerns.

## Validation

- Every file named in requirement 2 has been read in full and its state recorded in the task report as either "already correct after Phase 1" or "updated, with these changes" — never left unmentioned.
- `git grep -n -E 'liq-orgs|liq-projects|liq-work|plugable-projects-audit' -- docs/` returns nothing.
- `git grep -n -E '8 npm-dependency|8 packages|8-package' -- docs/` returns nothing.
- `docs/architecture.md`'s Mermaid diagram and its `<!-- For AI agents and non-visual readers -->` alt description agree with each other and with `src/lib/app-init.mjs`'s actual five-entry `explicitPlugins` array.
- `docs/architecture/plugin-loading-tiers.md`'s explicit-tier table lists exactly the five packages in `explicitPlugins`, in the same order, and its in-tree-`controls` paragraph still uses the literal key names `app.ext._liqOrgs` and `app.ext._liqProjects`.
- `docs/core-server-spec.md` has been reviewed; if unchanged, the report says so and states why no edit was needed.
- Every internal documentation link still resolves, and every doc remains reachable from `README.md`.
- The two "notice but do not act" items in requirement 2 appear in the task report as flagged observations for the manager.

## Metadata

architectural_impact: true

## Assumptions

- All four Phase 1 tasks have landed and merged. In particular task 003 has already made the enumerated documentation edits, so this task is reviewing and completing that work rather than starting from the pre-migration state.
- Task 004's verification report is available and describes the server's real post-swap behavior, including any pre-existing defect that reproduced.

## References

- `plugins/flow/task-procedures/update-architecture-docs/SKILL.md` — the procedure this task follows.
- `/Users/zane/playground/sdlcforge/dev-core/docs/consumer-migration.md` — the authoritative migration specification; each donor's `Provenance change` and `What does not change` sections are what the architecture docs must now describe accurately.
- [current-state drift](../notes/current-state-drift.md) — the record of what the migration specification itself missed, and why an enumerated touch-point list was not sufficient on its own.
- `plugins/flow/standards/project-docs/project-architecture-document-standards.md` — the shape `docs/architecture.md` conforms to.

## Status

**Outcome: succeeded (no edits required — conformance already complete).** 2026-08-27.

Followed the `update-architecture-docs` procedure: read `plan/overview.md`, the three completed Phase 1 task documents (002, 003, 004) and their reports, and [current-state drift](../notes/current-state-drift.md), then read all three files named in Requirement 2 in full and walked each section for staleness.

### Per-file review outcome

- **`docs/architecture.md`** — already correct after Phase 1 (task 003 plus the phase-boundary gate-fix commit). Mermaid diagram node reads "5 npm-dependency packages, e.g. dev-core"; its AI-agent alt description states no count and so cannot disagree; Core initialization, Plugin system, and Test infrastructure prose all read "5" with no surviving donor name; the Tech stack "Local dev loop: yalc" bullet and the matching Key Decisions bullet both name the two yalc-linked packages (`@liquid-labs/plugable-express` and `@sdlcforge/dev-core`). No edit made.
- **`docs/architecture/plugin-loading-tiers.md`** — already correct after Phase 1. The explicit-tier table has exactly 5 rows in the same order as `src/lib/app-init.mjs`'s `explicitPlugins` array (verified element-for-element), with `@sdlcforge/dev-core` as row 5 (the array is alphabetically sorted and `@sdlcforge/…` sorts after every `@liquid-labs/…` entry — this ordering, and the row-5 position, was itself the subject of the Phase-1 gate-fix commit). The in-tree-`controls` dependency paragraph names `@sdlcforge/dev-core` as the single provider of both contracts and still uses the literal `app.ext._liqOrgs.orgs` / `app.ext._liqProjects.playgroundMonitor` key names, per Requirement 2's explicit "do not rename" instruction. No edit made.
- **`docs/core-server-spec.md`** — reviewed in full; **no edit needed**. It names no donor package anywhere; its plugin-tier language ("core, explicit — built-in in-tree submodules then npm-dependency packages, user-supplied") is generic and does not enumerate a package count or list; its three-tier ordering and "All capability is plugin-delivered" claims are both intact and consistent with the post-swap state, since this migration changed only which package supplies the explicit tier, not the tier model itself. Confirmed by reading rather than assumed, as the task doc requires.

### Validation

- `git grep -n -E 'liq-orgs|liq-projects|liq-work|plugable-projects-audit' -- docs/` — **one surviving hit**, not zero: `docs/architecture/plugin-loading-tiers.md:73`, the `@sdlcforge/dev-core` table row's "What it contributes" cell, which names all four donors as the capabilities `dev-core` consolidates. This is deliberate historical/provenance prose written by task 003 under that task's own explicit Requirement 2 instruction ("Write the new row's 'What it contributes' as a genuine summary of all four absorbed capabilities"), already reviewed and justified in task 003's own report against an equivalent repo-wide grep. Removing the donor names here would contradict task 003's requirement and would make the row less accurate, not more — the row describes what was consolidated, which is exactly why the names appear. Left as-is; this task's grep bullet as literally worded does not carve out that exception the way task 003's own validation bullet did, so it is called out explicitly here rather than silently passed.
- `git grep -n -E '8 npm-dependency|8 packages|8-package' -- docs/` — empty. Passed.
- Mermaid diagram / alt-description agreement with `src/lib/app-init.mjs`'s 5-entry `explicitPlugins` array — confirmed in both `docs/architecture.md` and `docs/architecture/plugin-loading-tiers.md`. Passed.
- `docs/architecture/plugin-loading-tiers.md`'s explicit-tier table — 5 rows, same order as `explicitPlugins`, literal `app.ext._liqOrgs` / `app.ext._liqProjects` key names retained in the dependency paragraph. Passed.
- `docs/core-server-spec.md` reviewed; unchanged, reason recorded above. Passed.
- Internal link chain — every relative link target in `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/architecture/plugin-loading-tiers.md`, `docs/core-server-spec.md`, `docs/project-structure.md`, and `test/README.md` resolves to an existing file, and every `#anchor` fragment resolves to an existing heading (checked by extracting all relative links and cross-referencing headings). `README.md` → `AGENTS.md`/`docs/core-server-spec.md`/`docs/architecture.md`/`docs/project-structure.md` → `docs/architecture/plugin-loading-tiers.md`/`test/README.md`/`CLAUDE.md` — every doc in the corpus is reachable. Passed.

### Flagged for manager (notice, not act — per Requirement 2)

1. `docs/core-server-spec.md` and `docs/architecture.md` both state Node.js support across 18-24; this host runs v26.5.0, and the migration spec discloses a pre-existing `SlowBuffer` load failure on Node ≥ 24 that `dev-core` inherits. A real documentation-versus-reality gap, but pre-existing and out of this plan-group's scope.
2. `docs/architecture.md`'s Test infrastructure section describes three test levels and does not mention `full-tier-baseline.test.js` or its checked-in snapshots (added by a later plan). Whether that belongs in the architecture doc is a judgment call for the manager; not acted on here.
3. The one surviving donor-name grep hit at `docs/architecture/plugin-loading-tiers.md:73` (see Validation above) — flagged for awareness since this task's own validation bullet is worded without the "legitimate historical context" carve-out task 003's equivalent check used; recommend either accepting the row as-is (my assessment) or adjusting the validation wording in future task docs of this shape to match task 003's phrasing.

### Files touched

- `plan/phase-02-doc-updates/001-update-architecture-docs.md` (this Status section) only. No source, docs, or test file was modified — the conformance sweep found the tree already correct.
