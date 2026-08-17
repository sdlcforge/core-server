# Update Architecture Docs

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`), which is where the new subsystem now lives. It also **reads** `liq-projects` to confirm no stale architectural claim survives there.

Bring the architecture documentation in line with what this plan actually built: a new consolidated plugin package that replaces one (eventually four) previously separate plugin packages, with a single aggregation boundary, an ordered composite `setup`, and a set of runtime `app.ext` service contracts that other packages depend on. Invoke the `update-architecture-docs` task procedure at `plugins/flow/task-procedures/update-architecture-docs/SKILL.md`.

`@sdlcforge/dev-core` has no `docs/architecture.md` yet, so this task authors one rather than editing one.

## Requirements

The architectural implications this task documents were surfaced by these implementation task documents (all of which have completed by the time this phase runs):

- `plan/phase-01-dev-core-package-foundation/001-author-consolidation-contract.md`
- `plan/phase-01-dev-core-package-foundation/002-scaffold-build-and-entry-point.md`
- `plan/phase-02-liq-projects-migration/002-absorb-projects-into-dev-core.md`

Files to review and update:

- `/Users/zane/playground/sdlcforge/dev-core/docs/architecture.md` — **create.** It must cover:
  1. **What this package is in the system**: an explicit plugin of `@sdlcforge/core-server`, loaded by name through core-server's explicit-plugin list, consolidating development-lifecycle capability that previously shipped as four separate plugin packages.
  2. **Submodule decomposition**: `src/projects/` (landed), and `src/work/`, `src/orgs/`, `src/projects-audit/` (planned/landed as their own absorptions complete — describe accurately for the state at the time of writing, not aspirationally). One directory per absorbed package, each exposing `handlers` and optionally `setup` through its own `index.mjs`, with no cross-submodule imports.
  3. **The aggregation boundary**: `src/index.mjs` is the package's single plugin surface, because plugable-express's loader imports exactly one module per package and reads only `handlers` and `setup`, deriving the plugin's name and summary from `package.json`. Note the resulting provenance consequence: every endpoint reports `@sdlcforge/dev-core`.
  4. **The composite-setup ordering contract** and why it is load-bearing: `projects` first (it registers the GitHub credential provider and installs `app.ext._liqProjects`), then `orgs`, then `work`; `projects-audit` has no setup.
  5. **Runtime service contracts (`app.ext`)** as a first-class topology element: which submodule *provides* each key (`_liqProjects` from `projects`, `_liqOrgs` from `orgs`, `constants.WORK_DB_PATH` from `work`) and which components *consume* them — including the consumers outside this package (`liq-controls`, `liq-integrations-issues-github`) and the undeclared `GITHUB_API` credential contract. State plainly that these couplings are implicit today and that making them declared is the job of the planned compile-time plugin manifest, so a future reader does not mistake the description for an endorsement.
  6. **Route namespaces** each submodule owns (`/projects` shared between `projects` and `projects-audit`, `/work`, `/orgs`), and the fact that routes are declared per handler module rather than derived from file layout.
  7. **Build and artifact topology**: `src/index.mjs` → Rollup → `dist/dev-core.js` (externals-only), Babel → `test-staging/` → Jest for tests.
- `/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md` — review for drift. It was written before the first absorption ran; if the absorption corrected any part of the recipe, the contract must already say so (phase 2 task 002 was required to fix it), and the architecture doc must not contradict it. Report any inconsistency found rather than silently reconciling in one direction.
- `/Users/zane/playground/sdlcforge/dev-core/README.md` — update so it links `docs/architecture.md` and describes the package's shipped (not planned) state.
- `/Users/zane/playground/liquid-labs/liq-projects/README.md` — **read-only review**: confirm the superseded notice contains no architectural claim that the dev-core docs now contradict. Do not edit it; report any conflict.

There is no `docs/*-spec.md` in dev-core and none is created by this task; a specification document for the consolidated package is a larger piece of work that belongs with the later unification wave, not with this plan.

`role_doc: plugins/flow/roles/architect-backend.md` — the implications are backend component-boundary and API-surface changes (a package/plugin boundary, an aggregation layer, and runtime service contracts), with no data-model, cloud-topology, or frontend dimension.

Task procedure: `plugins/flow/task-procedures/update-architecture-docs/SKILL.md`.

## Validation

- `docs/architecture.md` exists in dev-core and covers all seven required elements — check them off individually in the report, noting any judged non-applicable with the reason.
- Every component, key, and path the document names is verified against the live tree, not asserted: each `src/` path exists, each `app.ext` key appears in the source that sets it (`grep`), and each named external consumer file exists and still reads the key it is cited for.
- The document describes the state as shipped. In particular, submodules that have not yet been absorbed are labelled as not yet present. `grep` the doc for each of `src/work`, `src/orgs`, `src/projects-audit` and confirm each mention carries the correct status.
- `README.md` links `docs/architecture.md`, and the link resolves.
- No contradiction between `docs/architecture.md` and `docs/dev-core-consolidation-contract.md` on the layout convention, the submodule interface, the setup ordering, or the `app.ext` freeze. Verify by reading both, and report any inconsistency instead of quietly editing the contract.
- `liq-projects`'s working tree is unmodified: `git -C /Users/zane/playground/liquid-labs/liq-projects status --short` shows no change from this task.
- `make lint` passes in dev-core (documentation-only changes must not disturb it).
- Markdown conforms to the playground's documentation standards: `## Purpose and scope` opens the document, no frontmatter, language-tagged fences, repo-relative internal links, and no plan/phase/task names or `plan/`-relative paths anywhere in the committed docs.

## Metadata

architectural_impact: true

## Assumptions

- **Cross-repository commit mechanics.** The task's own worktree is a `liq-projects` worktree, but the edits land in the dev-core checkout. Do the work on a dedicated branch in dev-core (e.g. `task/<this-task-slug>`) rather than committing to dev-core's `main`, and report the dev-core branch and commit SHA — merging that branch is a manager/user step. If a git operation there is refused by the environment's agent-scope guard, halt and report the exact command rather than working around it. The precedent for this pattern is core-server's completed `bun-conversion` task `003`, whose commit landed in the `comply-defaults` repository on its own `task/...` branch with the merge left unrecorded in the plan.

## References

- `plan/notes/dev-core-target-shape.md` — decisions D2, D5, D6, D7, D8; the source of the architectural statements this task documents durably.
- `plan/notes/liq-projects-source-inventory.md` — the route inventory and the verified consumer/`app.ext` reader list.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/load-plugins.js` and `src/lib/register-handlers.js` — the loader and route-registration mechanics the aggregation boundary rests on.
- `/Users/zane/playground/sdlcforge/core-server/src/lib/app-init.mjs` — how this package is loaded, and the `explicitPlugins` mechanism the compile-time manifest work will later replace.

## Checkpoint hints

- After the submodule-decomposition and aggregation-boundary sections are drafted and their claims verified against the tree.
- After the setup-ordering and `app.ext` service-contract sections are written with their consumers verified.
- After the route-namespace and build-topology sections and the `README.md` link update.
- After the contract-drift review and the read-only `liq-projects` README check.
