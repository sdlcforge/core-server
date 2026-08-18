# Dev-Core Consolidation Contract

## Purpose and scope

This document is the standing reference for `@sdlcforge/dev-core`'s internal shape: what the package is, how its four constituent submodules are laid out and absorbed, which runtime contracts they must preserve, and how a superseded source package is retired. It exists so that anyone absorbing a package into `dev-core`, or retiring one around it, has one authoritative statement of the convention to follow rather than re-deriving it from source each time. It does not cover routes, handlers, or business logic — those are documented per-submodule as they land; this document covers only the structural and contractual rules that make the consolidation coherent.

## Table of contents

1. [Package and repository identity](#package-and-repository-identity)
2. [Layout convention](#layout-convention)
3. [Submodule interface](#submodule-interface)
4. [Root-file ownership](#root-file-ownership)
5. [Absorption recipe](#absorption-recipe)
6. [Plugin contract](#plugin-contract)
7. [Composite setup ordering](#composite-setup-ordering)
8. [`app.ext` contract freeze](#appext-contract-freeze)
9. [Toolchain](#toolchain)
10. [Versioning, publishing, and consumption](#versioning-publishing-and-consumption)
11. [Source-package retirement policy](#source-package-retirement-policy)
12. [Publishing hygiene](#publishing-hygiene)
13. [Scope fences](#scope-fences)

## Package and repository identity

`@sdlcforge/dev-core` is published from `sdlcforge/dev-core` on GitHub, builds to `dist/dev-core.js`, and stays on the `1.0.0-alpha.x` version line while this consolidation is underway. This package supersedes four previously separate `@liquid-labs/plugable-express` plugin packages: `@liquid-labs/liq-projects`, `@liquid-labs/liq-work`, `@liquid-labs/liq-orgs`, and `@liquid-labs/plugable-projects-audit`.

The reasoning: `@sdlcforge/core-server` loaded these four packages as four separate `plugable-express` plugins, each with its own `package.json`, build, and release cycle, despite sharing one runtime (`app.ext`, described below) and one operational lifecycle. Collapsing them into a single package removes four sets of duplicated root-level tooling and makes the shared runtime contracts explicit in one place instead of four.

## Layout convention

Each absorbed package gets exactly one top-level directory under `src/`, named for its domain:

```text
src/
  index.mjs                 # plugin entry point: merged handlers + composite setup (dev-core-owned)
  projects/                 # <- absorbed from @liquid-labs/liq-projects
    index.mjs               # exports { handlers, setup }
    setup.mjs
    handlers/
      index.js
      _lib/                 # shared per-submodule libs, incl. _lib/test/ and _lib/test/data/
      test/                 # handler-level unit tests and their test/lib/ helpers
      releases/             # nested route group, with its own index.js and _lib/
  work/                     # <- absorbed from @liquid-labs/liq-work
  orgs/                     # <- absorbed from @liquid-labs/liq-orgs
  projects-audit/           # <- absorbed from @liquid-labs/plugable-projects-audit
```

Everything a source package had under its own `src/` moves under its one `src/<submodule>/` directory, preserving internal structure exactly, with one collapse: the now-redundant `handlers/<domain>/` nesting flattens to `handlers/`, because the submodule directory already carries the domain name. For example, `src/handlers/projects/archive.mjs` in the source package becomes `src/projects/handlers/archive.mjs` here.

Reasoning: one prefix per source package means no two absorptions can ever write the same path, so absorbing packages in any order — or independently, without coordinating between them — cannot conflict on content. Because every handler declares its own route via a `path` (or `paths`) export rather than via its file's position in the tree, this relocation never changes the HTTP surface it exposes.

`projects-audit` stays a separate top-level directory from `projects`, even though both mount under the `/projects` route namespace, because folding them together would re-couple two independently-absorbed submodules for no structural benefit; that is a cosmetic follow-up, not a requirement of this contract.

## Submodule interface

Each `src/<submodule>/index.mjs` exports `handlers` (an array) and, when the source package had one, `setup`. That is the entire public surface of a submodule — nothing else under `src/<submodule>/` is imported from outside it.

No cross-submodule imports are introduced. The four source packages never imported each other; their coupling was, and remains, entirely through runtime `app.ext` state (see [`app.ext` contract freeze](#appext-contract-freeze)). Keeping that true after consolidation is what keeps the submodule boundary legible for any later work that might split this package apart again or generalize its plugin-composition mechanism.

## Root-file ownership

`dev-core` owns, and authors exactly once, every package-level file: `package.json`, `package-lock.json`, `Makefile`, `make/*.mk`, `.sdlc-data.yaml`, `.gitignore`, `README.md`, `docs/`, and `src/index.mjs`.

An absorption never carries a source package's root files in. At absorb time, the following source-package files are dropped, because `dev-core`'s own version of each already wins: `package.json`, `package-lock.json`, `Makefile`, `make/`, `.gitignore`, `README.md`, `.sdlc-data.yaml`, `.catalyst-data.yaml`, any generated `docs/*.html`, the source package's root `src/index.*`, the source package's trivial `src/handlers/index.*` re-export, and **every file the source repository carries under `plan/`** — its own Flow planning tree.

That last item is deliberately stated as the whole directory rather than as a named file list. An absorption's merge source is frequently the source repository's *plan branch* rather than its `main`, because a plan-group's convention is for phase work to accumulate on the plan branch and merge to `main` only at plan close-out — and a plan branch carries the entire live plan tree, not just the between-sessions residue. The first absorption (`liq-projects`) brought in 19 `plan/` files this way: `TODO.yaml`, `overview.md`, `manifest.yaml`, `plan-summary-<slug>.md`, `notes/*.md`, `phases/*.md`, and every per-phase task document — where an earlier draft of this contract named only `plan/manifest.yaml` and `plan/plan-summary-*.md`. Enumerate what actually arrived (`git ls-tree -r --name-only <source-remote>/<branch> -- plan`) and `git rm` exactly that set.

Scope the removal to the arriving paths rather than reaching for `git rm -r plan/`: `dev-core` maintains a `plan/` directory of its own (`plan/followups.yaml`, tracked in `dev-core`'s own history), which a blanket removal would delete along with the source package's tree.

Planning artifacts get this special mention because they arrive as a **clean, non-conflicting merge** — git will not flag them, so nothing forces a manual look. Whoever performs an absorption must `git rm` them explicitly rather than relying on a merge conflict to surface them.

**A specific hazard worth calling out by name:** for at least one source package (`plugable-projects-audit`), the source's own root entry point is literally named `src/index.mjs` — identical to `dev-core`'s own aggregator path. A merge that is not sequenced correctly, or an absorption that forgets this file belongs on the drop list, will silently overwrite `dev-core`'s aggregator with that source package's thin re-export. Because that overwrite still passes `make build` (a valid module simply exporting less), it can land undetected, dropping every other submodule's handlers and the composite `setup` along with it. **After every merge, whoever performs the absorption must verify that `src/index.mjs`'s content is still `dev-core`'s own aggregator — not a source package's re-export — before considering the merge step complete.**

## Absorption recipe

Absorbing one source package into `dev-core` is a two-repository, six-step procedure:

1. **In the source repository**, relocate its tree in place to its final `src/<submodule>/…` path (per [Layout convention](#layout-convention)), and keep that repository green and independently buildable throughout: reduce its root `src/index.*` to a thin re-export of the relocated tree, so its own `main`/build entry, route surface, and `setup` export are all unchanged from the outside.
2. **In `dev-core`**, `git remote add` the source repository's checkout and `git fetch` it.
3. `git merge --allow-unrelated-histories <source-remote>/<branch>`.

   `<branch>` is not reliably `main`. Step 1's relocation typically lands on the source repository's *plan branch* and merges to its `main` only when that plan closes out, so the branch carrying the restructured tree is usually `plan/<plan-slug>` and the remote is usually the source repository's plan worktree. Confirm the tree before merging — `git ls-tree -r --name-only <source-remote>/<branch> -- src` must already show `src/<submodule>/…`, not the pre-restructure layout. Merging a pre-restructure tree writes every file to the wrong path and has to be undone by hand.
4. Resolve every root-level conflict in `dev-core`'s favor, and `git rm` the source package-level files that arrive as a clean, non-conflicting merge (the full list is in [Root-file ownership](#root-file-ownership)).

   **Do not treat git's conflict list as the list of root files to review.** `dev-core`'s `Makefile`, `make/*.mk`, and `.gitignore` were seeded from a source package's own generated set, so a source package whose copy is still byte-identical produces no conflict at all for those paths — git merges them silently. The first absorption saw only 6 of the 13 expected root-file conflicts for exactly this reason. Verify afterwards that `dev-core`'s version of every root-level path is what survived (compare each against its pre-merge blob), rather than inferring it from what git asked about.
5. Union the source package's runtime `dependencies` into `dev-core`'s `package.json` — on any overlapping dependency, take the higher version range and record the choice — then refresh `package-lock.json`.
6. Wire the new submodule into `src/index.mjs`, then verify `make build`, `make test`, and `make lint` are all green, plus that the endpoint count matches the source package's own pre-move baseline.

   The aggregator's submodule imports must be **extensionless directory imports** (`from './orgs'`, never `from './orgs/index.mjs'`). Rollup resolves either, but the test path does not: Babel emits `test-staging/<submodule>/index.js` from an `.mjs` source without rewriting import specifiers, so an explicit `.mjs` specifier builds cleanly and then fails module resolution under Jest.

Why a merge rather than a copy: `git merge --allow-unrelated-histories` keeps the source package's full history reachable under its new path prefix — `git log --follow src/projects/setup.mjs` still reaches the original commits after absorption — and because step 1 already puts every file at its final path before the merge happens, no `git subtree split` or path-rewriting step is needed at all.

## Plugin contract

`dev-core` is loaded the same way its four predecessors were: as a `plugable-express` plugin. The loader (`plugable-express`'s `src/lib/load-plugins.js`) dynamic-imports `<pluginDir>/<pkg.main>` and reads only two exports from that module, `handlers` and `setup` — nothing else the module exports is read. The plugin's identity in the server comes from the package manifest, not the module: `npmName` is `package.json`'s `name`, and the server-visible plugin `summary` is `package.json`'s `description` (`plugable-express`'s `src/lib/register-handlers.js` is the file that turns each handler's route declaration into a registered endpoint once `load-plugins.js` has collected `handlers`). Module-level `name`/`summary` exports, which some of the four source packages carried, are never read by the loader and are dead weight if carried forward.

The consequence: one package is one `plugable-express` plugin, so `dev-core` exports exactly **one** merged `handlers` array and **one** composite `setup` where its four predecessors exported four of each. `dev-core`'s `package.json` `description` is therefore the server-visible summary for the whole consolidated plugin and must be authored deliberately, not left empty.

The aggregator in `src/index.mjs` must build a **fresh** array (`[...projectsHandlers, ...workHandlers, ...]`) rather than relying on the `handlers.push(...)` mutation style some source packages used internally — once multiple submodules share one package, two of them mutating a shared array is a latent aliasing bug waiting to happen.

Every endpoint's recorded provenance `npmName` becomes `@sdlcforge/dev-core` once it is registered from this package, regardless of which submodule it came from. This is a visible, permanent change in the server's generated API spec and `help` output, not a rename that can be reverted per-endpoint later without re-splitting the package.

## Composite setup ordering

`dev-core`'s `setup` export is `async` and awaits each submodule's own setup, in this fixed order: `projects`, then `orgs`, then `work`. (`projects-audit` has no `setup` at all — handlers only.)

The ordering is not arbitrary: `projects`' setup is eager — it registers GitHub credentials and installs `app.ext._liqProjects = { playgroundMonitor, playgroundPath }` before returning — while `orgs` defers its own work onto `app.ext.setupMethods` (run later by the server) but still needs `app.ext._liqProjects` to already exist by the time that deferred work runs, and `work` only needs `app.ext.serverConfigRoot`, which is present from server initialization regardless of submodule order. Running `projects` first is therefore load-bearing, not a stylistic default.

`registerPathVar` is forwarded to each submodule's setup unchanged. The merged set of path variables these four submodules register — `projectName`, `newProjectName`, `orgKey`, `newOrgKey`, `parameterKey`, `workKey` — has no name collisions, so no submodule's registration can silently shadow another's. `parameterKey` is registered not from `orgs`' `setup` but from its `parameters-detail` handler's `func`, at route-registration time — a *handler* can register a path variable there too, so the merged path-variable surface is not fully determined by reading each submodule's `setup` function alone.

## `app.ext` contract freeze

`app.ext._liqProjects`, `app.ext._liqOrgs`, `app.ext.constants.WORK_DB_PATH`, and `app.ext.setupMethods` keep their exact current names through this consolidation. No participant in this consolidation renames them.

This is non-negotiable because code **outside** this consolidation's own repositories reads these names directly: `liq-controls` (`src/lib/resources/load-controls.mjs`, `src/lib/integrations/get-question-controls.mjs`) and `liq-integrations-issues-github` (`src/create-or-update-pull-request.mjs`) both read `app.ext._liqProjects` at runtime. Renaming any of these keys as part of this consolidation would turn a self-contained internal restructuring into a breaking change for packages this consolidation does not otherwise touch, for no benefit to either side. Declaring this coupling explicitly, rather than leaving it as an implicit contract two unrelated packages happen to agree on, is a separate and later concern for a compile-time plugin manifest — not something this consolidation attempts.

## Toolchain

`dev-core` uses npm, plus the Make-based toolchain the source packages already share via `@liquid-labs/sdlc-projects-workflow-local-node-build`: Babel transpiles into `test-staging/`, Jest runs the tests, Rollup bundles into `dist/dev-core.js`, and ESLint (via `@liquid-labs/sdlc-resource-eslint`) lints. This is deliberately **not** Bun, and this consolidation is not a toolchain redesign: `@sdlcforge/core-server`'s own Bun adoption was scoped to package management only, and it kept Rollup, Babel, Jest, and the Node runtime contract exactly as they were — this package follows the same precedent.

`make/*.mk` files are generated artifacts, inventoried in `.sdlc-data.yaml`; they are not meant to be hand-maintained divergently from what that generator would produce. Separately, replacing the `shelljs` runtime dependency with `node:child_process` is a known future item — needed before any Bun single-binary packaging of this package's consumers — that is deliberately out of scope here.

## Versioning, publishing, and consumption

`dev-core` stays on its `1.0.0-alpha.x` line. Consumers integrate against it via a local `file:.yalc/@sdlcforge/dev-core` link, the same mechanism `@sdlcforge/core-server` already uses for its other local packages — no registry publish is a prerequisite for a consumer to start using a given snapshot.

An `npm publish` is still attempted when a release point is reached; when the environment blocks it, the exact command is handed to whoever is driving the work rather than silently skipped. Repointing a consumer from a source package to `dev-core` is that consumer's own responsibility — this package supplies a precise, written handoff describing what changed and what a consumer needs to do, rather than editing any consumer directly.

## Source-package retirement policy

Retiring a source package once its functionality lives in `dev-core` is documentation and metadata work, not deletion, and it never ships a re-export shim in the source package's place. The sequence: a read-only verification gate confirming `dev-core` actually carries everything the source package had, a `README.md` rewritten as a superseded notice pointing at `dev-core`, a `package.json` `description` update leading with the deprecation plus a version bump, an attempted `npm publish`/`npm deprecate` (handed off verbatim if the environment blocks it), and GitHub repository archival left as an explicit decision for a human rather than performed automatically.

Two reasons rule out a re-export shim:

- A shim would register the same routes a second time. Duplicate registration does not degrade gracefully here: `plugable-express`'s path-variable registry throws `Path variable '<name>' is already registered.` on a second `registerPathVar` call for the same name, and its command-path registration throws `Non-unique command path: <path>` for a duplicated array-style path. Both are hard startup crashes, not silent shadowing — a stale shim left loaded alongside `dev-core` would crash the server outright rather than merely serve stale routes.
- Separately, the only npm dependent of any source package is `@sdlcforge/core-server`, and it repoints atomically from the source package to `dev-core` — there is no intermediate state where both need to be loaded at once, so there is nothing for a shim to bridge.

## Publishing hygiene

Every source package's retirement-time `npm publish`/`npm deprecate` step, and `dev-core`'s own eventual `npm publish`, must ship a `files` allowlist in `package.json` (or an equivalent `.npmignore`), derived from the package's own actual, previously-published tarball contents — not left to fall back to whatever a stale root `.gitignore` happens to exclude.

Without an explicit allowlist, `npm pack` picks up whatever local, non-shippable artifacts happen to sit in the working tree at publish time — planning-tool state directories, generated manifests, or a nested build/worktree copy of the package itself, lockfile included — none of which belong in a published tarball.

## Scope fences

This consolidation does not change behavior, routes, or `app.ext` names beyond what collapsing four packages into one unavoidably requires (the `npmName` provenance change described in [Plugin contract](#plugin-contract)). It does not upgrade any dependency beyond the version-range union described in [Absorption recipe](#absorption-recipe). And it does not absorb `liq-projects-lib` into the `projects` submodule: that package's one surviving real usage, `crossLinkDevProjects`, is consumed by the `work` submodule's source package, not by `projects`, and stays exactly where it is.
