# dev-core Target Shape — Shared Foundation Decisions

## Purpose and scope

The shared, cross-repository foundation for the federated `dev-core-consolidation` plan: the concrete target shape of the new `@sdlcforge/dev-core` package, the internal layout convention its four donor repositories relocate into, the plugin/`setup`/`app.ext` contracts that must be preserved, the absorption mechanic, and the retirement policy.

`liq-projects` is the lead slice of this plan-group and authored these decisions first. The other four participants (`liq-work`, `liq-orgs`, `plugable-projects-audit`, `liq-projects-lib`) plan their own contributions **on top of** this document and are expected to follow it rather than re-deciding. Every decision below is grounded in the source as it exists today; the evidence is cited inline so a later reader can re-verify rather than trust.

Durable copy: decision **D1–D11** below are re-authored, in dev-core's own words, as `docs/dev-core-consolidation-contract.md` in the `sdlcforge/dev-core` repository by phase 1 task 001 of this plan. That committed doc — not this ephemeral plan note — is the long-lived reference for task agents executing later phases in any of the five participant repos.

## D1 — Package and repository identity

- Package name: `@sdlcforge/dev-core`.
- GitHub repository: `sdlcforge/dev-core` (`git@github.com:sdlcforge/dev-core.git`).
- **The repository already exists and is already initialized.** Local checkout: `/Users/zane/playground/sdlcforge/dev-core`, one commit (`07d7f0e`, "package initialization"), `main` tracking `origin/main`, and exactly one tracked file: `package.json` carrying `@sdlcforge/dev-core@1.0.0-alpha.0`, `main: dist/dev-core.js`, `type: commonjs`, an empty `description`, and the `repository`/`bugs`/`homepage` triple already pointing at `sdlcforge/dev-core`. No repo creation, no `gh repo create`, and no name negotiation is in scope for any participant.
- `main: dist/dev-core.js` is authoritative — the build artifact name is already fixed by the existing `package.json`, so the Rollup target and the `make/50-*.mk` artifact rule follow it rather than the reverse.

## D2 — Internal layout: one submodule directory per donor

```text
src/
  index.mjs                 # plugin entry point: merged handlers + composite setup (dev-core-owned)
  projects/                 # <- liq-projects
    index.mjs               # exports { handlers, setup }
    setup.mjs
    handlers/
      index.js
      _lib/                 # shared per-submodule libs, incl. _lib/test/ and _lib/test/data/
      test/                 # handler-level unit tests and their test/lib/ helpers
      releases/             # nested route group, with its own index.js and _lib/
  work/                     # <- liq-work
  orgs/                     # <- liq-orgs
  projects-audit/           # <- plugable-projects-audit
```

Convention, stated as a rule the other three donors follow verbatim:

1. Each donor gets exactly one top-level directory under `src/`, named for its domain: `projects`, `work`, `orgs`, `projects-audit`.
2. Everything the donor has under its own `src/` moves under that one directory, preserving internal structure exactly — with one collapse: the now-redundant `handlers/<domain>/` nesting flattens to `handlers/`, because the domain is the submodule directory. So `src/handlers/projects/archive.mjs` becomes `src/projects/handlers/archive.mjs`; `src/handlers/work/_lib/save-lib.mjs` becomes `src/work/handlers/_lib/save-lib.mjs`.
3. Each submodule exposes `src/<submodule>/index.mjs` exporting `handlers` (an array) and, when the donor has one, `setup`. Nothing else is part of a submodule's public surface.
4. Cross-submodule imports are not introduced. The donors do not import each other today — their coupling is entirely through `app.ext` at runtime (D7) — and that stays true, which keeps the submodule boundary legible for the later Wave 4 `sdlc-core-unification` work.

Why this convention:

- **One prefix per donor makes the four absorptions independent.** No two donors write the same path, so the merges (D4) cannot conflict on content, and they can land in any order.
- **The move is a pure `git mv`.** Every intra-donor import is relative (verified in liq-projects: only three imports cross a directory boundary, all `../../_lib/...` inside `handlers/releases/_lib/`, and they still resolve after the flatten). No import rewriting is needed beyond the donor's own root `index`/`handlers/index` files.
- **Routes are unaffected.** Every handler declares its route in its own `path` (or `paths`) export — e.g. `const path = ['projects', ':projectName', 'archive']` in `archive.mjs` — and `registerHandlers` uses that export, never the file's position. Relocation cannot change the HTTP surface.
- **Test and fixture discovery keeps working unchanged.** `make/15-data-finder.mk` globs `*/test/data/*`, `*/test/data-*/*`, `*/test-data/*`; `make/20-js-src-finder.mk` treats `*/test/*` and `*.test.*js` as tests. Both are depth-agnostic, so deeper paths are fine.
- **`projects-audit` stays separate from `projects`** even though both mount under the `/projects` route namespace, because a shared directory would re-couple two independently-absorbed donors for no benefit. Folding `projects-audit` into `projects/audit/` later is a cosmetic follow-up, not a consolidation requirement.

## D3 — Root-file ownership

dev-core owns, and authors exactly once (phase 1 of this plan), every package-level file: `package.json`, `package-lock.json`, `Makefile`, `make/*.mk`, `.sdlc-data.yaml`, `.gitignore`, `README.md`, `docs/`, and `src/index.mjs`.

A donor absorption never carries donor package-level files in. At absorb time, dev-core's version of every root-level path wins, and these donor files are dropped: the donor's `package.json`, `package-lock.json`, `Makefile`, `make/`, `.gitignore`, `README.md`, `.sdlc-data.yaml`, `.catalyst-data.yaml`, any generated `docs/*.html`, the donor's root `src/index.*`, and the donor's trivial `src/handlers/index.*` re-export shim.

The one thing each donor's absorb task *does* write at the root: its own runtime `dependencies` entries, unioned into dev-core's `package.json` (D4 step 3), and one `import`/spread line in `src/index.mjs` (D4 step 4).

## D4 — Absorption mechanic (history-preserving, per-donor, conflict-free)

Each donor absorbs in two steps split across two repositories.

**Step A — restructure in the donor repo** (a task in the donor's own plan, executing in the donor's own worktree):

Move the donor's tree in place so it already sits at its final dev-core-relative path (`src/<submodule>/…` per D2), and keep the donor green and publishable while the transition runs: the donor's root `src/index.js` becomes a thin re-export of `./<submodule>` so its own `main`/Rollup entry, its route surface, and its `setup` export are all unchanged.

**Step B — absorb in the dev-core repo** (a task in the donor's own plan, executing in the dev-core checkout — see the cross-repository-task precedent in [`liq-projects-source-inventory.md`](./liq-projects-source-inventory.md)):

1. `git remote add <donor> <absolute local path to donor checkout>` and `git fetch <donor>`.
2. `git merge --allow-unrelated-histories <donor>/main`.
3. Resolve every root-level conflict in dev-core's favor and `git rm` the donor package-level files that arrive cleanly, per D3.
4. Union the donor's runtime `dependencies` into dev-core's `package.json` (on an overlap, take the higher range and record the choice in the task report), then refresh `package-lock.json`.
5. Wire the new submodule into `src/index.mjs`.
6. `make build && make test && make lint` green in dev-core, and verify handler-count/route parity against the donor's own pre-move baseline.

Why a merge rather than a copy: `git merge --allow-unrelated-histories` preserves the donor's full history under the submodule prefix — after absorption, `git log --follow src/projects/setup.mjs` still reaches the donor's original commits — and, because step A already put the files at their final paths, the merge needs no path rewriting, no `git subtree split`, and no `filter-repo`.

## D5 — Plugin contract: one package, one plugin

Read from `plugable-express` (`src/lib/load-plugins.js`, `src/lib/register-handlers.js`) — the mechanism the four donors are all loaded through today, via core-server's `explicitPlugins` array in `src/lib/app-init.mjs`:

- `loadPlugin` dynamic-imports `<pluginDir>/<pkg.main>` and reads **only** `handlers` and `setup` from the module. It throws when both are absent.
- The plugin's identity in the server comes from the *package*, not the module: `npmName` is `package.json` `name`, and the plugin `summary` is `package.json` `description` (with a `for a @liquid-labs/plugable-express server` suffix stripped). The module-level `name`/`summary` exports that liq-projects and liq-orgs carry are never read — liq-projects's `name = 'core-projects'` is inert today.

Consequences for dev-core:

- One package means **one** merged `handlers` array and **one** composite `setup` — four separate plugin registrations collapse into one. This is the single most load-bearing shape decision in the consolidation.
- dev-core's `package.json` `description` is currently `""` and becomes the plugin summary the server reports; it must be authored.
- The root aggregator builds a **fresh** array (`[...projectsHandlers, ...orgsHandlers, ...]`). It must not rely on the donors' `handlers.push(...)` side-effect style (`src/handlers/projects/index.js` pushes into the array imported from `./releases`), because two submodules mutating a shared array is a latent aliasing bug once they live in one package.
- Per-endpoint provenance changes: every endpoint's recorded `npmName` becomes `@sdlcforge/dev-core` instead of one of four names. Harmless at runtime, but visible in the server's generated API spec and `help` output — called out in the consumer-migration handoff.
- No `pluggable-endpoints` keyword is needed: core-server loads these by explicit name, and none of the four donors carries the keyword today.

## D6 — Composite `setup` and its ordering contract

dev-core's `setup` is `async` and awaits the submodule setups in this order:

1. `projects` — **must be first.** Its setup is eager: it registers GitHub credentials (`setupCredentials` from `@liquid-labs/credentials-db-plugin-github`), creates the playground directory, and installs `app.ext._liqProjects = { playgroundMonitor, playgroundPath }` before returning.
2. `orgs` — pushes three entries onto `app.ext.setupMethods` (run later by the server's `DependencyRunner`), one of which reads `app.ext._liqProjects.playgroundMonitor.getProjectsData()`, and registers the `orgKey`/`newOrgKey` path vars.
3. `work` — reads `app.ext.serverConfigRoot` and registers the `workKey` path var.
4. `projects-audit` — no `setup` at all; handlers only.

This ordering reproduces today's working behavior rather than inventing a new one. `registerPathVar` is forwarded unchanged to each submodule setup; the merged path-var name set (`projectName`, `newProjectName`, `orgKey`, `newOrgKey`, `workKey`) has no collisions.

## D7 — `app.ext` keys are frozen for this wave

`app.ext._liqProjects` and `app.ext._liqOrgs` keep their exact current names. No participant renames them.

They are read by code **outside** this plan-group: `liq-controls` (`src/lib/resources/load-controls.mjs`, `src/lib/integrations/get-question-controls.mjs`, plus a test fixture) and `liq-integrations-issues-github` (`src/create-or-update-pull-request.mjs`) — both participants of the sibling `core-server-domain-consolidation` plan-group. Renaming would turn a self-contained consolidation into a synchronized multi-plan breaking change for no gain. Making this coupling *declared* rather than implicit is the explicit job of Wave 3's `compile-time-manifest-framework`.

The same rule covers `app.ext.constants.WORK_DB_PATH` (set by liq-work's setup) and `app.ext.setupMethods` (used by liq-orgs): preserve as-is.

## D8 — Toolchain

dev-core keeps the donors' toolchain: npm + `package-lock.json`, `Makefile` including `make/*.mk` from `@liquid-labs/sdlc-projects-workflow-local-node-build`, Babel into `test-staging/` then Jest (`@liquid-labs/sdlc-resource-jest`), Rollup into `dist/dev-core.js` (`@liquid-labs/sdlc-resource-babel-and-rollup`), ESLint (`@liquid-labs/sdlc-resource-eslint`), and the `build`/`lint`/`lint:fix`/`test`/`qa`/`prepack`/`preversion` script set the donors share.

Not Bun, and not a toolchain redesign. core-server's own `bun-conversion` plan adopted Bun for *package management only* and explicitly kept Rollup, Babel, Jest, and the Node runtime contract; the Bun single-binary work is Wave 4 (`cli-mcp-binary-generation`), which also carries the recommendation to replace `shelljs` with `node:child_process` in this code — a known, deliberately out-of-scope follow-up here.

`make/*.mk` files are generated artifacts inventoried in `.sdlc-data.yaml`, not hand-authored source. dev-core's set is seeded from liq-projects's current set (builder version `1.0.0-alpha.5`) with exactly one substantive rename — `make/50-liq-projects-js.mk` → `make/50-dev-core-js.mk`, building `dist/dev-core.js` from `src/index.mjs` — and `.sdlc-data.yaml` updated to match so a future regeneration stays consistent. `.catalyst-data.yaml` (an older superseded builder's data file still present in the donors) is not carried over.

## D9 — Versioning, publishing, and how consumers pick dev-core up

- dev-core stays on the `1.0.0-alpha.x` line it was initialized with.
- core-server integrates it the same way it already integrates liq-projects and plugable-express: a local `file:.yalc/@sdlcforge/dev-core` link. **No registry publish is a prerequisite for integration.**
- An `npm publish` (and, for donors, `npm deprecate`) is attempted at the end of the relevant phase and handed to the user with the exact command when the environment blocks it — the established outcome for `@sdlcforge/core-cli` and `@liquid-labs/liq-integrations` in this same wave.
- Consumer repointing is owned by the consumer's own plan-group. For core-server that is `core-server-domain-consolidation`; this plan-group produces a precise handoff spec instead of editing core-server.

## D10 — Donor retirement policy: documentation and metadata, not deletion; no shim

Each donor ends as a final, working, clearly-labelled release:

1. A read-only verification gate confirming dev-core actually carries everything the donor had, before anything irreversible.
2. `README.md` rewritten as a superseded notice naming `@sdlcforge/dev-core`, with migration instructions and a known-consumer inventory.
3. `package.json` `description` rewritten to lead with the deprecation, version bumped, `make qa` green.
4. `npm publish` + `npm deprecate` attempted, and handed to the user verbatim if blocked.
5. GitHub repository archival left as an explicit user decision recorded as a follow-up, not performed.

`src/` is **not** stripped, and **no re-export shim package is published**, because:

- The only npm dependent of any donor is `@sdlcforge/core-server` (verified by a playground-wide `package.json` grep: the sole match for `"@liquid-labs/liq-projects"` outside the donor itself is core-server's `file:.yalc/...` entry), and it repoints atomically.
- A shim that re-exported handlers would register the same routes twice. `registerHandlers` has **no** duplicate-path detection — it calls `app[method](path, ...)` for whatever it is given — so Express would silently shadow the second registration and the generated API spec would carry duplicate endpoints. A silent-shadowing failure mode is strictly worse than a clean atomic swap.
- Non-npm consumers (`liq-controls`, `liq-integrations-issues-github`) couple only to the `app.ext._liq*` contracts that D7 preserves verbatim, so they need no shim and, indeed, no change at all.
- Stripping `src/` would break any server still loading the old package, which is why retirement is a labelled final release rather than a deletion (the same reasoning the sibling `liq-integrations` retirement recorded).

## D11 — Scope fences

- **No `liq-projects-lib` absorption work in the liq-projects slice.** Verified from source: liq-projects has no `@liquid-labs/liq-projects-lib` dependency in `package.json` and no import of it anywhere in `src/`. The surviving real usage is `crossLinkDevProjects`, imported by `liq-work` at `src/handlers/work/_lib/work-db.mjs` — liq-work's concern. `determineCurrentMilestone` inlining into `liq-integrations-issues-github` belongs to the sibling `core-server-domain-consolidation` plan-group.
- **No consumer edits inside consumer repos.** This plan-group produces handoff specs; `core-server-domain-consolidation` executes them.
- **No `app.ext` renames, no route changes, no behavior changes** beyond those forced by collapsing four packages into one (D5's provenance change).

## Phase numbering across the federated plan

This plan-group's phase numbers are globally unique across the five participants' `TODO.yaml` files. `liq-projects` (this plan) consumes **phases 1 through 4**. The next participant planned starts at **phase 5**.

## Sequencing across the five participant plans

- `liq-projects` phase 1 (dev-core package foundation) gates **every** other participant's absorb task: until `src/index.mjs`, the build, and the contract doc exist in dev-core, there is nothing to absorb into.
- `liq-projects` phase 2 lands the `projects` submodule. The other three donors' absorptions are independent of it and of each other (D4), so they may run in any order or concurrently once phase 1 has landed — subject to each one being a separate task-worktree operation against the same dev-core checkout, which means they should not run *simultaneously* against dev-core even though their content cannot conflict.
- Donor retirement phases depend only on their own absorb task, not on core-server repointing: a deprecation notice and a final publish break nothing while core-server is still linked to the old package.
