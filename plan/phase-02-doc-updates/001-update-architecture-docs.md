# Update Architecture Docs

## Purpose and scope

Update `@sdlcforge/dev-core`'s architecture and contract documentation to reflect the compile-time plugin manifest authored in Phase 1. Two of dev-core's standing docs currently describe these couplings as *undeclared* and explicitly defer their declaration to a future manifest; that future is now the present, and leaving those statements in place would leave the docs asserting the opposite of what the repository contains.

This is a documentation-only task. It changes no source, no `package.json`, and no manifest content.

## Requirements

### Planned implementation task documents that surfaced the architectural implications

These are the Phase 1 task documents whose work this task documents. All will have completed by the time this task runs:

- `plan/phase-01-plugin-manifest-declaration/001-add-plugable-express-dev-dependency.md`
- `plan/phase-01-plugin-manifest-declaration/002-author-plugin-manifest.md` — the task carrying `architectural_impact: true`
- `plan/phase-01-plugin-manifest-declaration/003-validate-manifest-against-source.md`
- `plan/phase-01-plugin-manifest-declaration/004-add-manifest-drift-guard-test.md`

Read the *as-landed* state of each — including the `## Reconciliation` section task 003 appends and any deferral set task 002 actually recorded — rather than planning-time intent.

### Files to review and update

- **`docs/dev-core-consolidation-contract.md`** — its [`app.ext` contract freeze](../../docs/dev-core-consolidation-contract.md#appext-contract-freeze) section closes with: *"Declaring this coupling explicitly, rather than leaving it as an implicit contract two unrelated packages happen to agree on, is a separate and later concern for a compile-time plugin manifest — not something this consolidation attempts."* That sentence is now stale in one direction only — the consolidation still did not attempt it, but the manifest now exists — so repoint it at the declaration rather than deleting the history. The `app.ext` key names themselves remain frozen and unchanged; do not imply the manifest relaxes that freeze.

  Also review its [root-file ownership](../../docs/dev-core-consolidation-contract.md#root-file-ownership) list: `package.json` is already enumerated there, and the manifest lives inside it rather than as a new root file — confirm that remains accurate and note the `"plugable"` block if the list benefits from naming it. Its [publishing hygiene](../../docs/dev-core-consolidation-contract.md#publishing-hygiene) section is directly relevant too: the future `files` allowlist it mandates is precisely why the block form was chosen over a root `plugable.yaml`, and recording that link is what stops someone later "simplifying" the manifest into a file that the allowlist would silently drop.

- **`docs/architecture.md`** — its "Runtime service contracts" table documents the `app.ext`-mediated couplings and the previously-undeclared `GITHUB_API` credential-registration coupling. Update it so each documented contract points at its now-declared capability, and so the table distinguishes what is declared from what is deliberately deferred. Do **not** duplicate the manifest's contents into the table — carry the pointer, not a second copy that will drift.

- **`README.md`** — task 002 already added a paragraph covering the form choice, the deferral set, and the `components:`-order-is-load-order rule. Review it for consistency with the final landed state and for conformance with the project's documentation conventions; extend rather than rewrite. Confirm every doc touched here remains reachable by link from `README.md`.

- **`docs/consumer-migration.md`** — review only. The manifest changes nothing a consumer must do, so the expected outcome is no edit; confirm that and say so rather than editing for its own sake.

- **No project specification file exists.** `docs/` contains `architecture.md`, `consumer-migration.md`, and `dev-core-consolidation-contract.md` — there is no `docs/*-spec.md` to review. Confirm this still holds (`ls docs/*-spec.md`) rather than assuming; if one has appeared, review it too.

### Points the documentation must get right

- **The manifest is build/CI-time only and runtime-inert.** Nothing reads it at boot; `appInit()` performs no pre-flight check; a plugin set with no manifests validates clean. Any wording implying the manifest affects loading, setup order, or route registration is wrong.
- **`components:` array order is normative load order**, mirroring `src/index.mjs`. Reordering `src/index.mjs`'s `submoduleSetups` is now also a manifest change — this is a new, real constraint on future work and belongs in the contract doc, not only in the README.
- **The deferred declarations are deliberate**, and the docs should say why: the six unguarded `integrationHook:` requirements are deferred because their providers are unmanifested and the schema's escape hatch lives at the host, not at the plugin. Record the reason, not just the fact.
- **`appExt:credentialsDB` reporting unsatisfied is the intended outcome**, not an outstanding defect — it is the requiring half of a real historical bug, and `@sdlcforge/core-server` closes it from its own side on its own schedule.
- **The `'pull requests'` typo** at `src/work/handlers/_lib/answer-set-to-md.mjs:74`, if task 003 confirmed it, is a real source defect that this plan deliberately did not fix. Whether it is documented here or handled purely as a manager-tracked item is the manager's call — do not add it to `plan/followups.yaml` from this task.

### Procedure

Follow the `update-architecture-docs` task-procedure at `plugins/flow/task-procedures/update-architecture-docs/SKILL.md`, resolved against the Flow plugin root supplied in the dispatch.

role_doc: `plugins/flow/roles/architect-backend.md`

The implications are component-boundary and cross-package-contract in nature — how dev-core's four submodules declare their coupling surface to a host server — which is the backend/API/component case this role covers. They are not data-model, cloud/topology, or frontend changes.

### Hard constraints

- Documentation only. Do not modify `src/`, `package.json`, `package-lock.json`, `Makefile`, or `make/`.
- **Do not modify `@liquid-labs/plugable-express` or `@sdlcforge/core-server`.**
- **Do not modify `plan/followups.yaml`.**
- Do not rename or relax any frozen `app.ext` key, or document any such change.

## Validation

- `docs/dev-core-consolidation-contract.md`'s `app.ext` contract freeze section no longer describes the manifest as a purely future concern, and its statement that the key names stay frozen is intact and unweakened.
- `docs/architecture.md`'s "Runtime service contracts" content points at the declared capabilities and distinguishes declared from deferred, without restating the manifest's contents verbatim.
- `docs/consumer-migration.md` was reviewed; either it is unchanged with that fact stated in the task report, or the change made is justified.
- `ls docs/*-spec.md` confirms no specification file exists (or, if one does, it was reviewed).
- Every claim added is checkable against the landed `package.json` `"plugable"` block — no aspirational or planned-but-not-landed declaration is documented as present. Cross-check each capability string named in prose against the block character for character.
- Every doc touched remains reachable by link from `README.md`, and internal links use repo-relative paths that resolve.
- `git diff --stat` shows only `.md` files under the repository root and `docs/`. `git diff --stat -- src package.json package-lock.json` produces no output.
- `make lint` is unaffected (it lints JS, not Markdown) and `make build` still succeeds.
- No test run is required — this task changes no executing code. If one is made, note that `make test` / `make qa` are known-red at baseline (followup `2aMD`) and compare failure lists rather than expecting green.

## References

- [capability census](../notes/capability-census.md) — the grounded inventory behind every declaration the docs will describe.
- [manifest scope and tooling](../notes/manifest-scope-and-tooling.md) — the form decision and the declare-versus-defer reasoning the docs must record accurately.
- [plan overview](../overview.md) — the deliberate-deferrals section, which the documentation should agree with.
- `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md` and `docs/plugin-manifest-contract.md` — the normative schema and the versioned downstream contract. Read-only reference.
