# Absorb Donor Plugins

## Goals

Bring all three donors' source into `core-server`'s own tree by history-preserving merge, wire each through the Phase 4 mechanism, and remove each from the Tier-2 explicit npm-dependency list — leaving the server's HTTP surface and integration-hook surface identical to Phase 3's baseline.

Each donor is absorbed by the `dev-core-consolidation-contract`'s six-step [absorption recipe](/Users/zane/playground/sdlcforge/dev-core/docs/dev-core-consolidation-contract.md#absorption-recipe): `git remote add` the donor checkout, `git fetch`, `git merge --allow-unrelated-histories <donor-remote>/plan/core-server-domain-consolidation` — **the donor's plan branch, not `main`** — resolve root-level conflicts in `core-server`'s favor, `git rm` the donor's package-level files that arrive as clean non-conflicting merges, union the donor's runtime dependencies, and wire the submodule in. Before merging, confirm `git ls-tree -r --name-only <donor-remote>/plan/core-server-domain-consolidation -- src` already shows the relocated layout; merging a pre-restructure tree writes every file to the wrong path and has to be undone by hand.

The critical property of each donor's task is that **wiring in and unplugging must land together**. `plugable-express`'s command-path registration throws `Non-unique command path: <path>` on a second registration of the same array-style path, and `registerPathVar` throws `Path variable '<name>' is already registered.` on a duplicate name. Both are hard startup crashes, not silent shadowing. So a single donor's absorb task must, in one landing, add the in-tree registration *and* remove that donor's entry from `explicitPlugins` in `src/lib/app-init.mjs` and from `package.json` `dependencies` — never one without the other. All three donors carry `keywords: []`, so no keyword-discovery path can re-load them behind the removal and no `supersededPlugins`-style skip list is needed.

The three donors are otherwise independent of each other and are sequenced by donor readiness, not by any dependency between them.

## Inputs

- **Each donor's own Phase 1 relocation, landed on that donor's `plan/core-server-domain-consolidation` branch.** This is a hard, per-donor, cross-project gate that this plan cannot enforce through its own tooling. As of authoring: `liq-controls`' relocation is planned and committed but not executed; `liq-credentials` and `liq-integrations-issues-github` have plan branches but no authored plans at all. A donor's absorb task must not be dispatched before its relocation has landed.
- Phase 4's registration mechanism.
- Phase 3's baseline artifact — the thing each donor's absorption is checked against, one donor at a time.
- [`plan/notes/absorption-layout-and-merge-hazards.md`](../notes/absorption-layout-and-merge-hazards.md) — the landing paths (`src/controls/`, `src/credentials/`, `src/integrations-issues-github/`), the root-file drop list, the dependency-union table, and the two add/add collisions (`src/lib/index.js` on the `liq-controls` merge; `src/index.js` on both of the others) that merge silently wrong if resolved by reflex.
- [`plan/notes/absorbed-surface-inventory.md`](../notes/absorbed-surface-inventory.md) — per-donor routes, setup methods, providers, hooks, dependencies, and tests to port.
- For `liq-integrations-issues-github` specifically: the state of its own `determineCurrentMilestone` inlining task at absorb time. Absorb whatever the donor's source actually is then; check whether `@liquid-labs/liq-projects-lib` still needs to enter the dependency union rather than assuming either way. Its undeclared-but-imported `@liquid-labs/octocache` must be declared explicitly regardless.

## Outputs

- `src/controls/`, `src/credentials/`, and `src/integrations-issues-github/` present in `core-server`'s tree with each donor's full history reachable under the new prefix (`git log --follow` on a relocated file reaches its original commits).
- `explicitPlugins` reduced from 11 entries to 8, and the three corresponding `package.json` `dependencies` entries removed, with each donor's own runtime dependencies unioned in and no new `file:` spec introduced.
- Every route, path variable, setup method, integration provider, and hook from Phase 3's baseline still present and behaving identically — served from `dist/sdlcforge-server.js` rather than from `node_modules`.
- Each donor's ported tests running as part of `core-server`'s own suite, with `make build`, `make test`, and `make lint` green.
- Updated golden API-spec and plugins-list snapshots, with every accepted diff enumerated and justified against the plugin-identity decision rather than silently re-recorded.
- Verified afterwards, by blob comparison against each pre-merge commit, that `core-server`'s own version of every root-level path survived — git's conflict list is not the list to review, since donors and `core-server` share generated `Makefile`/`make/*.mk` content that merges silently.
- A single aggregate parity gate at the end of the phase, run once all three donors have landed: the full-tier harness rerun against Phase 3's baseline with every diff matched against the pre-agreed parity contract, a root-file blob comparison against each pre-merge commit, a bundle audit confirming no undeclared bare specifier was silently inlined, and a `git log --follow` reachability spot-check per donor.

The `@sdlcforge/core-server` version bump and publish attempt confirmed in [`plan/notes/scope-confirmation.md`](../notes/scope-confirmation.md) is **not** part of this phase — it runs after the documentation updates, as the plan's final phase, so the published artifact carries accurate docs.
