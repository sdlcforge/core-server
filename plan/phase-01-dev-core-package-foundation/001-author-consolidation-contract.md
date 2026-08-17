# Author Consolidation Contract

## Purpose and scope

**Executes in the `sdlcforge/dev-core` repository** (`/Users/zane/playground/sdlcforge/dev-core`), not in `liq-projects`. This is the cross-repository task pattern already established by core-server's completed `bun-conversion` task `003-add-server-config-root-accessor-to-comply-defaults`, which executed in the `comply-defaults` repository: work on a task branch in the named repository, commit there, and report the commit.

Write the durable consolidation contract for `@sdlcforge/dev-core` — the document every one of the five `dev-core-consolidation` participants cites when absorbing into or retiring around this package — plus dev-core's own `README.md`. This is the gate task for the whole plan-group: no other task in any participant repo should proceed until it has landed, because it is the single statement of the layout convention, root-file ownership, absorption recipe, and preserved runtime contracts.

Documentation only. This task writes no code, edits no `package.json`, and adds no build files (that is task 002).

## Requirements

1. **Create `docs/dev-core-consolidation-contract.md`** in dev-core, authored in dev-core's own voice as a standing reference (not as a plan artifact, and with no reference to plan/phase/task names — the plan is torn down; this document outlives it). It must state, each with the reasoning that justifies it:

   1. **Package and repository identity.** `@sdlcforge/dev-core`, GitHub `sdlcforge/dev-core`, artifact `dist/dev-core.js`, alpha version line. Note that this package supersedes four previously separate plugin packages: `@liquid-labs/liq-projects`, `@liquid-labs/liq-work`, `@liquid-labs/liq-orgs`, `@liquid-labs/plugable-projects-audit`.
   2. **Layout convention.** One top-level directory under `src/` per absorbed package — `src/projects/`, `src/work/`, `src/orgs/`, `src/projects-audit/` — each holding everything that package had under its own `src/`, with the redundant `handlers/<domain>/` level flattened to `handlers/` (so `src/handlers/projects/archive.mjs` becomes `src/projects/handlers/archive.mjs`). Include the directory tree as a fenced `text` block.
   3. **Submodule interface.** Each `src/<submodule>/index.mjs` exports `handlers` (array) and, when the source package had one, `setup`. That is the submodule's entire public surface. No cross-submodule imports are introduced; inter-submodule coupling stays where it already is — runtime `app.ext` state.
   4. **Root-file ownership.** `package.json`, `package-lock.json`, `Makefile`, `make/*.mk`, `.sdlc-data.yaml`, `.gitignore`, `README.md`, `docs/`, and `src/index.mjs` are dev-core-owned and authored once. An absorption never carries a source package's root files in; list the specific files that are dropped at absorb time (source `package.json`, `package-lock.json`, `Makefile`, `make/`, `.gitignore`, `README.md`, `.sdlc-data.yaml`, `.catalyst-data.yaml`, generated `docs/*.html`, root `src/index.*`, and the trivial `src/handlers/index.*` re-export).
   5. **Absorption recipe**, as an explicit numbered procedure: (a) in the source repo, relocate the tree in place to its final `src/<submodule>/…` path and keep that repo green by reducing its root `src/index.*` to a thin re-export; (b) in dev-core, `git remote add` the source checkout, `git fetch`, `git merge --allow-unrelated-histories <remote>/main`, resolve all root-level conflicts in dev-core's favor, `git rm` the cleanly-arriving source root files; (c) union that source's runtime `dependencies` into dev-core's `package.json`, taking the higher range on any overlap and recording the choice; (d) refresh `package-lock.json`; (e) wire the submodule into `src/index.mjs`; (f) verify `make build`/`make test`/`make lint` green plus route-count parity against the source's pre-move baseline. State why a merge rather than a copy: the source history stays reachable under the new prefix (`git log --follow src/projects/setup.mjs`), and because step (a) already put files at their final paths no `subtree split` or path rewriting is needed.
   6. **Plugin contract.** One npm package is one plugable-express plugin: the loader (`plugable-express`, `src/lib/load-plugins.js`) dynamic-imports `<dir>/<pkg.main>` and reads only `handlers` and `setup`, taking the plugin's `npmName` from `package.json` `name` and its `summary` from `package.json` `description`; module-level `name`/`summary` exports are never read. Therefore dev-core exports exactly one merged `handlers` array and one composite `setup`; its `description` is the server-visible plugin summary; the aggregator must build a **fresh** array rather than relying on the `handlers.push(...)` mutation style the source packages use; and every endpoint's recorded provenance `npmName` becomes `@sdlcforge/dev-core`.
   7. **Composite setup ordering.** `setup` is `async` and awaits submodule setups in the order `projects` → `orgs` → `work` (`projects-audit` has none), because `projects`' setup is eager — it registers GitHub credentials via `@liquid-labs/credentials-db-plugin-github` and installs `app.ext._liqProjects = { playgroundMonitor, playgroundPath }` before returning — while `orgs` defers its work onto `app.ext.setupMethods` but still needs `_liqProjects` to exist, and `work` only needs `app.ext.serverConfigRoot`. Note that `registerPathVar` is forwarded unchanged and that the merged path-var set (`projectName`, `newProjectName`, `orgKey`, `newOrgKey`, `workKey`) has no collisions.
   8. **`app.ext` contract freeze.** `app.ext._liqProjects`, `app.ext._liqOrgs`, `app.ext.constants.WORK_DB_PATH`, and `app.ext.setupMethods` keep their exact names through this consolidation. Name the external readers that make this non-negotiable: `liq-controls` (`src/lib/resources/load-controls.mjs`, `src/lib/integrations/get-question-controls.mjs`) and `liq-integrations-issues-github` (`src/create-or-update-pull-request.mjs`). Renaming is a separate, later concern (declaring these dependencies rather than leaving them implicit is the job of the planned compile-time plugin manifest).
   9. **Toolchain.** npm plus the source packages' `@liquid-labs/sdlc-projects-workflow-local-node-build` Make targets, Babel → `test-staging/` → Jest, Rollup → `dist/dev-core.js`, ESLint via `@liquid-labs/sdlc-resource-eslint`. Not Bun, and no toolchain redesign: core-server adopted Bun for package management only and kept Rollup/Babel/Jest and the Node runtime contract. Note that `make/*.mk` files are generated artifacts inventoried in `.sdlc-data.yaml` and must not be hand-maintained divergently, and that replacing `shelljs` with `node:child_process` is a known future item (needed before any Bun single-binary packaging) that is deliberately out of scope.
   10. **Versioning, publishing, and consumption.** dev-core stays on `1.0.0-alpha.x`; consumers integrate via a local `file:.yalc/@sdlcforge/dev-core` link exactly as core-server already does for other packages, so no registry publish gates integration; an `npm publish` is attempted and handed to the user with the exact command when the environment blocks it; consumer repointing is owned by the consumer's own project, and this package supplies a written handoff spec instead of editing consumers.
   11. **Source-package retirement policy.** Documentation and metadata, not deletion, and no re-export shim: verification gate → README superseded notice → deprecation-bearing `description` plus version bump → attempted `npm publish`/`npm deprecate` → repository archival left as an explicit user decision. State the two reasons a shim is refused: a shim would re-register the same routes a second time and `registerHandlers` has no duplicate-path detection (Express would silently shadow, and the generated API spec would carry duplicates), and the only npm dependent of any source package is `@sdlcforge/core-server`, which repoints atomically.
   12. **Scope fences.** No behavior changes, no route changes, no `app.ext` renames, no dependency upgrades beyond the union, no `liq-projects-lib` absorption in the `projects` submodule (that package's surviving usage, `crossLinkDevProjects`, is consumed by `liq-work` at `src/handlers/work/_lib/work-db.mjs`).

2. **Create `README.md`** in dev-core: what the package is (the consolidated development-lifecycle plugin for `@sdlcforge/core-server`, covering the project triad, work orchestration, org settings, and project audits), the four submodules and what each owns, how it is loaded (an explicit plugin of core-server exporting `handlers` and `setup`), the build/test commands, and a link to `docs/dev-core-consolidation-contract.md`. Keep it accurate to the current state — at the end of this task the submodules do not exist yet, so describe them as the planned composition rather than as shipped capability, and do not document routes this package does not yet serve.

3. **Do not** create, modify, or delete `package.json`, `Makefile`, `make/*.mk`, `.sdlc-data.yaml`, `.gitignore`, or anything under `src/`. Task 002 owns all of those.

4. Report the dev-core branch and commit SHA in the structured report, since the task's commit lives in a different repository from the plan.

## Validation

- `docs/dev-core-consolidation-contract.md` and `README.md` exist in the dev-core checkout and are the only files added or changed: `git status --short` in dev-core shows exactly those two paths.
- Every one of the twelve numbered contract elements above is present and substantive — check by reading back the finished document against this list, item by item, and note any element you judged non-applicable with the reason.
- The layout section contains a fenced directory tree showing all four submodule directories and the `src/index.mjs` entry point.
- The absorption recipe is a numbered, executable procedure naming the actual git commands, not a prose gesture at them.
- Cross-references resolve: the two `plugable-express` source files cited (`src/lib/load-plugins.js`, `src/lib/register-handlers.js`) and the two external `app.ext` readers cited (`liq-controls`, `liq-integrations-issues-github` paths) all exist as named. Verify by reading them, not by assuming.
- No plan/phase/task names, no review-lens boilerplate, and no references to `plan/` paths appear in either document — both must stand on their own after this plan is torn down.
- `README.md` documents no route or capability the package does not yet have.
- Markdown conforms to the project documentation standards in use across this playground: `## Purpose and scope` opens the contract document, no YAML frontmatter, fenced code blocks specify a language, and internal links are repo-relative.

## Metadata

architectural_impact: true

## Assumptions

- **Cross-repository commit mechanics.** The task's own worktree is a `liq-projects` worktree, but the edits land in the dev-core checkout. Do the work on a dedicated branch in dev-core (e.g. `task/<this-task-slug>`) rather than committing to dev-core's `main`, and report the dev-core branch and commit SHA — merging that branch is a manager/user step. If a git operation there is refused by the environment's agent-scope guard, halt and report the exact command rather than working around it. The precedent for this pattern is core-server's completed `bun-conversion` task `003`, whose commit landed in the `comply-defaults` repository on its own `task/...` branch with the merge left unrecorded in the plan.

- The dev-core checkout is at `/Users/zane/playground/sdlcforge/dev-core`, is clean, and is on `main` at commit `07d7f0e` with `package.json` as its only tracked file. If it has diverged (extra files, other branches), report the difference rather than working around it.
- dev-core has no `node_modules` and no lockfile; nothing in this task needs either.
- dev-core is not itself a Flow-managed project with its own `plan/` directory, and this task must not create one there.

## References

- `plan/notes/dev-core-target-shape.md` — decisions D1–D11 with full rationale and source citations; this task transcribes them into dev-core's own committed contract. Read it in full first.
- `plan/notes/liq-projects-source-inventory.md` — the evidence base behind the plugin-contract, `app.ext`, and consumer statements.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/load-plugins.js` — authoritative on what a plugin package must export and where `npmName`/`summary` come from.
- `/Users/zane/playground/liquid-labs/plugable-express/src/lib/register-handlers.js` — authoritative on route registration and the absence of duplicate-path detection.
- `/Users/zane/playground/sdlcforge/core-server/src/lib/app-init.mjs` — the `explicitPlugins` list that loads all four source packages today.
- `/Users/zane/playground/liquid-labs/liq-integrations/plan/plan-summary-framework-consolidation.md` — the completed sibling retirement whose policy element 11 restates.

## Checkpoint hints

- After `docs/dev-core-consolidation-contract.md` is drafted through element 6 (identity, layout, submodule interface, root-file ownership, absorption recipe, plugin contract).
- After the remaining elements 7–12 are written and self-checked against the requirement list.
- After `README.md` is written and the cited source files have been re-read to confirm every citation.
