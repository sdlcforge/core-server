# Update Architecture Docs

## Purpose and scope

Update `@sdlcforge/core-server`'s architecture, specification, and contributor documentation to reflect the changes this plan's implementation phases land: three domain plugins stop being Tier-2 explicit npm-dependency packages and become in-tree modules of the server itself, registered through a new `builtinPlugins` affordance in `@liquid-labs/plugable-express`, and reported to clients under `@sdlcforge/core-server`'s own package identity rather than under three donor package names.

Invoke the `update-architecture-docs` task-procedure at `plugins/flow/task-procedures/update-architecture-docs/SKILL.md`.

## Requirements

`role_doc: plugins/flow/roles/architect-backend.md`

The architectural implications here are backend component-boundary and public-interface changes — a plugin-loading tier is reshaped, a framework composition seam is added, and two HTTP endpoints' response content changes. No data-model, cloud-topology, or frontend variant applies.

### Planned implementation task documents that surfaced these implications

These are the implementation tasks whose changes this documentation pass describes. All will have completed by the time this phase runs:

- `plan/phase-04-in-tree-plugin-mechanism/003-wire-builtin-plugins-aggregator.md` — introduces `src/lib/builtin-plugins.mjs` and the `builtinPlugins` registration path; a new composition seam in the server's initialization sequence.
- `plan/phase-05-absorb-donor-plugins/001-absorb-liq-controls.md` — `src/controls/` enters the source tree; `@liquid-labs/liq-controls` leaves the explicit tier.
- `plan/phase-05-absorb-donor-plugins/002-absorb-liq-credentials.md` — `src/credentials/` enters the source tree; `@liquid-labs/liq-credentials` leaves the explicit tier; the `app.ext.credentialsDB` contract is now published from in-tree code.
- `plan/phase-05-absorb-donor-plugins/003-absorb-liq-integrations-issues-github.md` — `src/integrations-issues-github/` enters the source tree; `@liquid-labs/liq-integrations-issues-github` leaves the explicit tier; three integration-provider registrations change `npmName`.
- `plan/phase-05-absorb-donor-plugins/004-verify-post-absorption-parity.md` — the authoritative record of what actually changed observably, as opposed to what was planned. Read its report before writing anything.

### Architecture and spec files to review

Each of the following must be reviewed and updated where it describes the pre-absorption state:

- **`docs/architecture/plugin-loading-tiers.md`** — the Tier-2 table and the `11 npm-dependency packages` label in its mermaid diagram. The explicit tier becomes **8** packages, and a new built-in/in-tree tier must be described alongside it: modules under `core-server`'s own `src/`, aggregated by `src/lib/builtin-plugins.mjs`, registered through `plugable-express`'s `builtinPlugins` `appInit` option at the same point in the sequence npm-discovered core plugins occupy, and — this part matters and is easy to omit — **suppressed by `skipCorePlugins: true` exactly as core-plugin discovery is**.
- **`docs/architecture.md`** — carries a **pre-existing** error independent of this plan: it describes thirteen explicit plugins against an array that held eleven even before any absorption. Correct that as well as describing the new tier. `CLAUDE.md` repeats the same "13 explicit plugins" claim and should be corrected in the same pass.
- **`docs/core-server-spec.md`** — spec-described behavior about where the server's capability comes from. Must also state the deliberate, accepted consumer-visible diff: `GET /server/plugins/list` and `GET /server/plugins/integrations/list` no longer report the three donor package names, absorbed capability is attributed to `@sdlcforge/core-server`, and `GET /server/plugins/details/@liquid-labs%2Fliq-controls` (and its two siblings) stop resolving while `@sdlcforge/core-server` becomes a valid `serverPluginName` value.
- **`docs/project-structure.md`** — `src/controls/`, `src/credentials/`, and `src/integrations-issues-github/` are new top-level source directories, siblings of `src/lib/` and `src/cli/`; `src/lib/builtin-plugins.mjs` is a new file; `test/__snapshots__/` gains the full-tier baseline snapshots.
- **`AGENTS.md`** and **`README.md`** — any statement of the plugin set, the package count, or where capability comes from.

### Standing constraints

- Describe what **is**, not the transition. These are permanent reference documents; a reader a year from now should not have to reconstruct a migration to understand the current design.
- The one load-order fact the dropped `plugable-express.yaml` recorded — that controls genuinely requires both `liq-orgs` and `liq-projects` loaded — must survive somewhere in the documentation, since the file that recorded it is gone.
- Note in passing that this mechanism is expected to be superseded: Wave 3's `compile-time-manifest-sdlc-server` plan-group is chartered to replace the `explicitPlugins` runtime array with a compile-time manifest. Do not design around that here, but do not write as though the current shape is permanent either.
- `src/lib/test/golden-api-spec.test.js` carries an in-source comment block asserting that loading the real explicit-plugin set "currently throws" because of the `serverHome`/`serverConfigRoot` rename. That is now factually false — the bug is fixed in every package that carried it. Correct that comment in this phase (the earlier phases were instructed to leave the file untouched precisely so the correction lands here, deliberately, rather than as incidental churn inside a merge).

## Validation

- Every file named above has been read and either updated or explicitly recorded as needing no change, with the reason.
- No document asserts a plugin count, a package name, or a source-tree layout that the post-absorption source contradicts. Verify the explicit-tier count against `src/lib/app-init.mjs`'s actual array (8) rather than against any prose.
- `grep -rn 'liq-controls\|liq-credentials\|liq-integrations-issues-github' docs/ AGENTS.md README.md CLAUDE.md` returns only intentional historical references, each of which reads correctly in the past tense.
- `grep -rn '11 npm-dependency\|13 explicit\|thirteen' docs/ AGENTS.md README.md CLAUDE.md` returns nothing stale.
- Any mermaid diagram edited still renders, and its labels match the prose around it.
- All documentation conforms to the project's markdown standards; internal links use repo-relative paths and resolve.
- The `golden-api-spec.test.js` comment correction is present and the test still passes with no behavioral edit.

## References

- `plugins/flow/task-procedures/update-architecture-docs/SKILL.md` — the task-procedure to invoke.
- [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md) — the mechanism as designed and as landed, including the `skipCorePlugins` gating semantics the tier document must state.
- [`plan/notes/plugin-list-visibility.md`](../notes/plugin-list-visibility.md) — the identity decision and the reasoning behind accepting a truthful content diff over byte-identical output.
- `plan/resources/absorption-parity-contract.md` — the enumerated list of what changed observably.
- `plan/phase-05-absorb-donor-plugins/004-verify-post-absorption-parity.md` — the verification report to read before writing.

## Checkpoint hints

- After `docs/architecture/plugin-loading-tiers.md` (table, prose, and diagram).
- After `docs/architecture.md` and `CLAUDE.md`, including the pre-existing 13-vs-11 correction.
- After `docs/core-server-spec.md`.
- After `docs/project-structure.md`, `AGENTS.md`, and `README.md`.
- After the `golden-api-spec.test.js` comment correction and the final grep sweeps.
