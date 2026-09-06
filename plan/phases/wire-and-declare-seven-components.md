# Wire And Declare Seven Components

## Purpose and scope

Phase 3 of the `sdlc-core-unification` plan. Moves behavior: the four absorbed components stop being loaded as an npm plugin and start being loaded in-tree, and all seven are declared to the compile-time plugin manifest in DAG order.

## Goals

1. **Aggregate seven components in DAG order.** `src/lib/builtin-plugins.mjs`'s `submodules` array becomes `credentials → projects → orgs → controls → issues-github → work → projects-audit`, using extensionless directory namespace imports (`import * as projects from '../projects'`). Extensionless is not a style preference: Babel emits `test-staging/<component>/index.js` from an `.mjs` source without rewriting import specifiers, so an explicit `.mjs` specifier builds cleanly under Rollup and then fails module resolution under Jest.

   Namespace imports remain mandatory for the same reason the file already documents — every component exports a symbol named `setup` and most export `handlers`, so a star re-export across them is an ambiguous-export collision.

2. **Preserve the composite setup ordering rather than flattening it.** The aggregator's `setup` stays a sequential `for…of` with `await`, never `Promise.all`, and the ordering constraints `dev-core`'s contract fixes (`projects` before `orgs` before `work`; `projects-audit` contributes no `setup` at all and appears in `handlers` only) are carried by position in the one `submodules` array rather than by a separate mechanism. `credentials` before `projects` joins them as a newly load-bearing constraint: `projects`' `setup()` eagerly calls `setupCredentials({ credentialsDB: app.ext.credentialsDB })`, and until now that ordering held only because the two lived in different plugin tiers.

3. **Accept and record the reordering of the existing three.** `controls` moves from first to fourth so `orgs` can precede it — which is the entire mechanism by which the `violated-by-source-order` finding becomes provable rather than allowlisted. This contradicts `builtin-plugins.mjs`'s own standing "keep it stable, and add to the end rather than reordering" instruction, which must be corrected in the same change rather than left contradicting the file's contents.

4. **Declare all seven under `plugable.host.builtins[0].components`,** in the same order, replacing the current three-entry list. Dev-core's four component bodies (`provides`/`requires`, with their `phase`, `optional`, `exclusive`, `via`, and `reason` fields) are translated from its plugin-manifest form into host-builtin form. `via`/`reason` strings that cite source paths must be repointed to the new in-tree paths — `src/orgs/setup.mjs:6-10` remains correct, but any citation that assumed dev-core's package root does not.

5. **Remove `@sdlcforge/dev-core` completely, atomically with the wiring.** From `src/lib/app-init.mjs`'s `explicitPlugins` array, from `package.json`'s `plugable.host.explicitPlugins`, and from `package.json`'s `dependencies` (dropping the `file:.yalc/@sdlcforge/dev-core` spec), with `bun.lock` regenerated.

   Atomicity is not stylistic. Loading a component both in-tree and via npm is a hard startup crash for anything registering a route (`Non-unique command path`) or a path variable (`Path variable 'X' is already registered.`) — and dev-core registers five path variables from `setup` plus `parameterKey` from a handler. For `projects-audit`, which registers nothing at setup, a double-load would instead be *silent*.

6. **Close the order-agreement gap with a real check.** Nothing today ties the runtime `submodules` order to the declared `components` order — `verifyHostDeclaration()`'s order check compares `npmName` sequences across `builtinPlugins` entries, of which this host has exactly one, and its component check is a *set* comparison that is skipped entirely because `builtinPluginsFor()` supplies no inline `manifest` key. With seven components whose order is load-bearing in both directions, that gap would let the validator certify `outcome: 'ok'` against an order the server does not use. Export an explicit ordered component-name list from `builtin-plugins.mjs` and assert element-for-element equality against `package.json`'s declared components in Jest.

## Inputs

- Phase 2's output: the merged tree with `src/{projects,orgs,work,projects-audit}/`, unioned dependencies, and a green but behaviorally-unchanged build.
- The merged-manifest graph projection research (`plan/notes/merged-manifest-graph-projection.md`), outstanding at the time this summary was written — it converts the DAG order's predicted `outcome: 'ok'` from a projection into a measurement, and any correction it produces to the component order lands here.
- `@sdlcforge/dev-core`'s `package.json` `plugable.components` array (four component bodies) as the source for the translated declarations.
- [`notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md) — the ordering rationale, the load-order model the validator uses, and the drift-guard gap.
- `src/lib/test/host-declaration.test.js` and `src/lib/test/builtin-plugins.test.js` — the existing tests over the surfaces this phase changes.

## Outputs

- `src/lib/builtin-plugins.mjs` aggregating seven components in DAG order, with its guidance comments corrected to describe the reordering rule that now applies, and exporting an ordered component-name list.
- `package.json` declaring seven components in matching order under `plugable.host.builtins[0].components`, with `@sdlcforge/dev-core` absent from `explicitPlugins`, `dependencies`, and `bun.lock`.
- `src/lib/app-init.mjs`'s `explicitPlugins` down to the four `@liquid-labs/sdlc-projects-*` packages, with its standing comment about deliberately-absent absorbed packages extended to name the four newly-absorbed components.
- A Jest assertion enforcing element-for-element agreement between the runtime component order and the declared component order.
- A server that starts, registers 165 routes, and passes `host-declaration.test.js`. Snapshot rebaselining and gate tightening belong to Phase 4, so this phase's own snapshot diffs are expected and are handed forward rather than resolved here.
