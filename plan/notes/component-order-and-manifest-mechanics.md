# Component Order And Manifest Mechanics

## Purpose and scope

Why the merged package declares its seven in-tree components in the order it does, what that order is load-bearing *for*, and the one gap in the existing drift guard that the ordering decision walks straight into. Read this before authoring any task that touches `src/lib/builtin-plugins.mjs` or `package.json`'s `plugable.host.builtins[0].components` array — the two must agree, and nothing currently checks that they do.

## Two different orders, both currently called "load order"

There are two independent orderings in play, and the plan's whole "provable rather than allowlisted" goal depends on them agreeing:

1. **The runtime order** — the `submodules` array in `src/lib/builtin-plugins.mjs`. This is the order the aggregator's `setup` awaits each submodule in, and the order each submodule's `handlers` are concatenated in. It determines what actually happens at server start, and it fixes absorbed routes' positions in `app.ext.handlers` and therefore in the generated API spec.
2. **The declared order** — `package.json`'s `plugable.host.builtins[0].components` array. This is what `@liquid-labs/plugable-express`'s compile-time validator reads. Its own reader states the rule directly: entries are "flattened into a single `loadIndex` sequence reflecting both the `builtins` array order and, within one entry, `components:` order — the two together are the tier's whole load order" (`src/lib/host-declaration.js`, `normalizeBuiltins`).

The validator's source-order verdicts (`satisfied-by-source-order`, `violated-by-source-order`) are computed entirely from ordering 2. The server's actual behavior is determined entirely from ordering 1. They are separate arrays in separate files.

## The DAG order, and what each position buys

Declared and wired order, for both arrays:

```text
credentials → projects → orgs → controls → issues-github → work → projects-audit
```

Each edge in that chain is justified, not stylistic:

- **`credentials` before `projects`** — load-bearing at runtime. `projects`' `setup()` calls `setupCredentials({ credentialsDB: app.ext.credentialsDB })` eagerly, and `credentials`' `setup()` is what assigns `app.ext.credentialsDB`. Today this ordering holds only because `credentials` is a `core-server` builtin (registered first) while `projects` arrives inside the `@sdlcforge/dev-core` explicit plugin (registered later). Once both are components of the same aggregate, the `submodules` array is the *only* thing preserving it.
- **`projects` before `orgs`** — the ordering `docs/dev-core-consolidation-contract.md`'s "Composite setup ordering" section fixes. `projects`' setup installs `app.ext._liqProjects` eagerly; `orgs` defers work onto `app.ext.setupMethods` that reads it.
- **`orgs` before `controls`** — load-bearing for the *declared* order, and the single reason the whole reordering happens. `core-server#controls` requires `appExt:_liqOrgs.orgs @ setup`, which `orgs` provides at the same phase; same-phase satisfaction is decided by source order. With `controls` ahead of `orgs`, the validator reports `violated-by-source-order` — exactly the finding sitting in `ALLOWLISTED_ERROR_FINDINGS` today (followups `Pwdb`, and dev-core's `x6x1`). With `orgs` ahead of `controls`, the same edge should resolve `satisfied-by-source-order` with nothing to allowlist.
- **`work` after `controls`** — `work` requires `integrationHook:controls/getQuestionControls` at runtime (declared `optional: true`), which `controls` provides during setup. `work`'s position is otherwise the contract's fixed convention rather than a dependency.
- **`projects-audit` last** — it has no `setup` at all. It requires `pathVar:projectName`, registered by `projects`' setup, and reads `app.ext._liqProjects.playgroundMonitor` at request time. Any position after `projects` satisfies it; last keeps it visibly terminal.

Every other declared requirement resolves within or ahead of this chain: `issues-github` needs `appExt:credentialsDB` (runtime) and `credential:GITHUB_API` (runtime, optional, provided by `projects` at load); `orgs` needs `appExt:_liqProjects.playgroundMonitor` (setup, from `projects` at load); `controls` needs `pathVar:orgKey` (from `orgs` at load) and `appExt:_liqProjects.playgroundMonitor` (runtime).

**This is a projection, not a measurement.** It is derived by reading the two manifests and the validator's ordering rule, not by running `validatePluginSet()` against a merged manifest. Confirming it empirically — before any merge is attempted — is what the merged-manifest graph projection research exists to do.

## This reorders the existing three components

`src/lib/builtin-plugins.mjs`'s `submodules` array is `[controls, credentials, issuesGitHub]` today, and the file's own comment (fact 2) instructs future editors to "keep it stable, and add to the end rather than reordering." The DAG order **contradicts that instruction deliberately**: `controls` has to move from first to fourth so that `orgs` can precede it.

The consequence is concrete and must be declared as an accepted diff rather than discovered as a snapshot failure. `submodules` order fixes absorbed routes' positions in `app.ext.handlers`, so:

- `credentials`' 2 routes move ahead of `controls`' 2 routes within the builtin block;
- dev-core's 112 routes move from *after* the four `sdlc-projects-*` explicit plugins to *inside* the builtin block, interleaved among the existing six.

Route **count** stays 165 and no `path`, `method`, `matcher`, `help`, or `parameters` value changes. Only order and `npmName` provenance change. `full-tier-api-spec.json` must be rebaselined; `golden-api-spec.json` and `golden-plugins-list.json` must **not** move at all, since both are captured with `skipCorePlugins: true`, which suppresses the whole builtin tier.

The `builtin-plugins.mjs` comment itself needs correcting as part of the wiring work — leaving an instruction in the file that the file's own contents violate is worse than either alternative.

## The drift guard does not check what the comment claims it checks

`src/lib/builtin-plugins.mjs` states that `package.json`'s components array "must be kept in the same order as this `submodules` array" and names `verifyHostDeclaration()`'s Jest assertion (`src/lib/test/host-declaration.test.js`) as "the enforcement mechanism that keeps the two from silently drifting apart."

Reading `plugable-express`'s `src/lib/verify-host-declaration.js`, that is **not what it does**:

- Its order check (`host-declaration-builtins-order-mismatch`) compares the **`npmName` sequence** across `builtinPlugins` entries against the declared `builtins` entry sequence. `core-server` has exactly one `builtinPlugins` entry, so this check is trivially satisfied by a one-element-versus-one-element comparison and can never fail here.
- Its component check compares an entry's declared component set against that entry's own **inline `manifest` key**, and it is a *set* comparison (`setsAgree`), not an ordered one. `builtinPluginsFor()` returns `{ npmName, version, summary, module }` with no `manifest` key at all, so `entryManifestComponentSet()` returns `null` and the comparison is **skipped entirely**.

So today nothing — not `verifyHostDeclaration()`, not the graph gate, not any other test — ties the runtime `submodules` order to the declared `components` order. With three components whose ordering was not load-bearing that was a latent gap. With seven components whose ordering *is* load-bearing in both directions, it becomes the exact failure mode this plan is trying to eliminate: the validator would happily certify `outcome: 'ok'` against a declared order the running server does not use.

Closing it is cheap and belongs in the wiring work rather than a follow-up: export an explicit ordered component-name list from `src/lib/builtin-plugins.mjs` alongside `submodules` (the namespace imports carry no name of their own to introspect), and assert in Jest that it equals `package.json`'s `plugable.host.builtins[0].components.map(({ component }) => component)` exactly, element for element. That turns "these two arrays must agree" from a comment into a check.

## Related documents

- [`pre-merge-state.md`](./pre-merge-state.md) — the measured baseline this ordering decision changes.
- [`../resources/absorption-parity-contract.md`](../resources/absorption-parity-contract.md) — the predecessor plan-group's treatment of the same route-ordering question, at three components rather than seven.
