# Wire And Declare Seven Components

## Purpose and scope

Phase 3 of the `sdlc-core-unification` plan. Moves behavior: the four absorbed components stop being loaded as an npm plugin and start being loaded in-tree, and all seven are declared to the compile-time plugin manifest in DAG order.

## Goals

1. **Aggregate seven components in DAG order.** `src/lib/builtin-plugins.mjs`'s `submodules` array becomes `credentials → projects → orgs → controls → issues-github → work → projects-audit`, using extensionless directory namespace imports (`import * as projects from '../projects'`). Extensionless is not a style preference: Babel emits `test-staging/<component>/index.js` from an `.mjs` source without rewriting import specifiers, so an explicit `.mjs` specifier builds cleanly under Rollup and then fails module resolution under Jest.

   Namespace imports remain mandatory for the same reason the file already documents — every component exports a symbol named `setup` and most export `handlers`, so a star re-export across them is an ambiguous-export collision.

2. **Preserve the composite setup ordering rather than flattening it.** The aggregator's `setup` stays a sequential `for…of` with `await`, never `Promise.all`, and the ordering constraints `dev-core`'s contract fixes (`projects` before `orgs` before `work`; `projects-audit` contributes no `setup` at all and appears in `handlers` only) are carried by position in the one `submodules` array rather than by a separate mechanism. `credentials` before `projects` joins them as a newly load-bearing constraint: `projects`' `setup()` eagerly calls `setupCredentials({ credentialsDB: app.ext.credentialsDB })`, and until now that ordering held only because the two lived in different plugin tiers.

3. **Accept and record the reordering of the existing three.** `controls` moves from first to fourth so `orgs` can precede it — which is the entire mechanism by which the `violated-by-source-order` finding becomes provable rather than allowlisted. This contradicts `builtin-plugins.mjs`'s own standing "keep it stable, and add to the end rather than reordering" instruction, which must be corrected in the same change rather than left contradicting the file's contents.

4. **Declare all seven under `plugable.host.builtins[0].components`,** in the same order, replacing the current three-entry list. Dev-core's four component bodies (`provides`/`requires`, with their `phase`, `optional`, `exclusive`, `via`, and `reason` fields) are translated from its plugin-manifest form into host-builtin form. `via`/`reason` strings that cite source paths must be repointed to the new in-tree paths — `src/orgs/setup.mjs:6-10` remains correct, but any citation that assumed dev-core's package root does not.

   This declaration is no longer a projection. The [merged-manifest graph projection](../notes/merged-manifest-graph-projection.md) built exactly this seven-component manifest and ran `plugable-express`'s real `validatePluginSet()` against it: `outcome: 'ok'`, `exitCode: 0`, `counts: { error: 0, warning: 0, info: 1 }`. The note carries the candidate manifest verbatim and it is the copy source for this task. A 5040-permutation sweep found only two binding precedence constraints — `credentials < projects` and `orgs < controls` — so the other five positions in the DAG order are justified by runtime behavior and the consolidation contract, not by the validator, which is precisely why goal 6's order-agreement check is not optional.

   **Source the four absorbed component bodies from dev-core's *source* checkout (`/Users/zane/playground/sdlcforge/dev-core/package.json`, or its `main` HEAD), never from `node_modules/@sdlcforge/dev-core/package.json`.** The installed yalc copy differs in exactly one place — `orgs`' `requires` lacks `optional: true` on `appExt:_liqOrgs.orgSetupMethods` and lacks two runtime requirements — and transcribing it yields `validation-failure` with exactly 1 error that reads like "the plan's premise was wrong" and is in fact the [known yalc drift](../notes/pre-merge-state.md#confirmed-yalc-drift). Phase 2's git merge brings dev-core's source text into the tree, so the natural path is already the correct one; this is a warning for whoever transcribes or double-checks the block, not an extra step.

5. **Remove `@sdlcforge/dev-core` completely, atomically with the wiring.** From `src/lib/app-init.mjs`'s `explicitPlugins` array, from `package.json`'s `plugable.host.explicitPlugins`, and from `package.json`'s `dependencies` (dropping the `file:.yalc/@sdlcforge/dev-core` spec), with `bun.lock` regenerated. All three edits land together or not at all. Afterwards `grep -n 'file:' package.json` shows **exactly one** hit, the pre-existing `@liquid-labs/plugable-express` yalc link — never zero.

   Atomicity is not stylistic. Loading a component both in-tree and via npm is a hard startup crash for anything registering a route (`Non-unique command path`) or a path variable (`Path variable 'X' is already registered.`) — and dev-core registers five path variables from `setup` plus `parameterKey` from a handler. For `projects-audit`, which registers nothing at setup, a double-load would instead be *silent*.

   The graph-level consequence was measured too, and a verification task must be able to read it correctly: leaving the `explicitPlugins` entry in place while the seven-component `builtins` block lands produces `validation-failure` with **21 errors and 2 warnings** — 18 `conflict` findings over 15 capabilities, a `cycle`, the re-appearing `violated-by-source-order` error, the stale-copy `unsatisfied` error, and 2 `order-unprovable` warnings. That is loud and unmistakable, but it means "the `explicitPlugins` entry was not removed", **not** "the merged manifest is wrong". Dropping the `dependencies` entry alone is not sufficient — discovery is driven by `explicitPlugins` membership — while leaving the physical package in `node_modules` with both declarations gone is harmless, since dev-core declares `"keywords": []` and is never keyword-discovered.

6. **Close the order-agreement gap with a real check.** Nothing today ties the runtime `submodules` order to the declared `components` order — `verifyHostDeclaration()`'s order check compares `npmName` sequences across `builtinPlugins` entries, of which this host has exactly one, and its component check is a *set* comparison that is skipped entirely because `builtinPluginsFor()` supplies no inline `manifest` key. With seven components whose order is load-bearing in both directions, that gap would let the validator certify `outcome: 'ok'` against an order the server does not use. Export an explicit ordered component-name list from `builtin-plugins.mjs` and assert element-for-element equality against `package.json`'s declared components in Jest.

   The permutation sweep sharpens the argument for this check: five of the seven positions are free as far as the validator is concerned, and `projects` before `orgs` in particular is load-bearing at *runtime* (`orgs`' deferred `load orgs` setup method reads `app.ext._liqProjects.playgroundMonitor`) while scoring as a cross-phase edge with no order verdict at all. The validator will not catch a regression in those five positions. This assertion is the only thing that will.

7. **Port `src/test/index.test.mjs`'s assertions into `src/lib/test/builtin-plugins.test.js`.** Phase 2 `git rm`s the donor file — it cannot survive there, and at merge time there is nothing for its aggregate assertions to assert against — and hands its substance here, to be added to `core-server`'s **existing** test rather than reconstituted as a parallel `src/test/` tree. Each assertion has a direct analogue over the seven-component aggregate:

   | Donor assertion | Post-merge form | Adaptation |
   |---|---|---|
   | `handlers` is a fresh array, not an alias of any submodule's | Same, over the `flatMap` result across 7 submodules | Mechanical. `builtin-plugins.mjs`' own fact-1 comment names this exact hazard and nothing currently asserts it. |
   | No `(method, path)` pair registered twice | Same, across all 7 submodules' merged handlers | Mechanical, and **more valuable** at seven than at four — a strictly larger duplicate surface. |
   | The 4 `projects-audit` routes, exact paths | Same | Mechanical. |
   | `projects-audit` contributes handlers but no `setup` | Same | Mechanical. |
   | Composite `setup` runs submodules in fixed order and populates `app.ext` | Same, over `builtinPluginsFor(...)[0].module.setup` | **Needs adaptation.** Expected `registeredPathVars` grows to include `credential` (from `credentials`); expected `app.ext.setupMethods` grows from `orgs`' 3 entries to include `controls`' 2 and `issues-github`' 1. The literal arrays cannot be copied. |
   | `app.ext.constants.WORK_DB_PATH` exact key path; `workKey` `validationRe` | Same | Mechanical — `app.ext` contract-freeze assertions, valid verbatim. |

   Carry forward one piece of discipline from the *other* donor suite, which is dropped outright: its "do not assert an overall-clean graph, name the expected out-of-package gaps explicitly" rule. `plugin-graph-gate.test.js` already embodies it, and Phase 4 must preserve it while tightening.

## Inputs

- Phase 2's output: the merged tree with `src/{projects,orgs,work,projects-audit}/`, unioned dependencies, and a green but behaviorally-unchanged build.
- [`notes/merged-manifest-graph-projection.md`](../notes/merged-manifest-graph-projection.md) — **complete**, and it confirms the DAG order unchanged: `outcome: 'ok'`, zero errors. It carries the full candidate manifest verbatim, the two binding precedence constraints, and the two failure modes goals 4 and 5 guard against.
- [`notes/merge-arrival-inventory.md`](../notes/merge-arrival-inventory.md#4-disposition-of-dev-cores-package-level-tests) — the assertion-by-assertion analysis behind goal 7's port.
- `@sdlcforge/dev-core`'s **source-checkout** `package.json` `plugable.components` array (four component bodies) as the source for the translated declarations — never the `.yalc`/`node_modules` copy.
- [`notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md) — the ordering rationale, the load-order model the validator uses, and the drift-guard gap.
- `src/lib/test/host-declaration.test.js` and `src/lib/test/builtin-plugins.test.js` — the existing tests over the surfaces this phase changes.

## Outputs

- `src/lib/builtin-plugins.mjs` aggregating seven components in DAG order, with its guidance comments corrected to describe the reordering rule that now applies, and exporting an ordered component-name list.
- `package.json` declaring seven components in matching order under `plugable.host.builtins[0].components`, with `@sdlcforge/dev-core` absent from `explicitPlugins`, `dependencies`, and `bun.lock`.
- `src/lib/app-init.mjs`'s `explicitPlugins` down to the four `@liquid-labs/sdlc-projects-*` packages, with its standing comment about deliberately-absent absorbed packages extended to name the four newly-absorbed components.
- A Jest assertion enforcing element-for-element agreement between the runtime component order and the declared component order.
- `src/lib/test/builtin-plugins.test.js` carrying the ported donor assertions, with the two adapted expectation arrays (`registeredPathVars`, `app.ext.setupMethods`) written against the seven-component reality rather than copied.
- A server that starts, registers 165 routes, and passes `host-declaration.test.js`. Snapshot rebaselining and gate tightening belong to Phase 4, so this phase's own snapshot diffs are expected and are handed forward rather than resolved here.
