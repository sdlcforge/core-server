# Wire Builtin-Plugins Aggregator And Prove With Probe

## Purpose and scope

Land `core-server`'s own side of the in-tree registration mechanism — the `src/lib/builtin-plugins.mjs` aggregator and the `src/lib/app-init.mjs` wiring — in an **empty-but-shaped** form, and prove the whole registration path end to end with a test-injected probe plugin before a single line of absorbed donor code depends on it.

Landing the wiring against a plugin that changes nothing is the point: when a Phase 5 merge later goes wrong, the failure is unambiguously in the merge rather than in the registration path.

Scope is `src/lib/builtin-plugins.mjs`, `src/lib/app-init.mjs`, and new test code. **Do not touch `explicitPlugins`, do not merge any donor, and do not add any submodule import** — there is nothing at `src/controls/`, `src/credentials/`, or `src/integrations-issues-github/` yet, and there must not be after this task either.

## Requirements

1. **Create `src/lib/builtin-plugins.mjs` in empty-but-shaped form.** An empty `submodules` array; `handlers` as its `flatMap` (therefore `[]`); a composed `async setup` that iterates `submodules` sequentially awaiting each `submodule.setup?.(setupArgs)` (therefore a no-op); a literal `summary`; and a `builtinPluginsFor({ npmName, version })` factory returning a **single-element** array `[{ npmName, version, summary, module: { handlers, setup } }]`.

   Two properties must be present from the start, before there is any submodule to exercise them, because retrofitting them later is exactly the kind of change that gets forgotten:
   - The composed `setup` **forwards the framework's argument object unchanged** to each submodule (`await submodule.setup?.(setupArgs)`), so no submodule can observe a difference from being called through the aggregator.
   - Iteration is **sequential (`for...of` with `await`), not `Promise.all`** — mirroring `loadPlugins`' own one-plugin-at-a-time await, and keeping a submodule that writes to `app.ext` visible to a later one.

   Carry an in-source comment recording the two facts a future reader will otherwise rediscover the hard way: that `submodules` order is load order and fixes absorbed-route position in the API spec, and that `plugable-express` threads a **single** `setupData` into every handler registered under one entry — so a submodule ever needing distinct `setupData` must become its own `builtinPlugins` entry rather than being merged into this one.

2. **Use namespace imports when submodules arrive.** The file must be written so that Phase 5 adds `import * as controls from '../controls'`-style **namespace** imports. `export * from` across the submodules is an ambiguous-export collision: all three export a symbol named `setup` and two export `handlers`. Record this constraint in the file's own comment so a Phase 5 agent does not "simplify" it.

3. **Wire `src/lib/app-init.mjs`, minimally.** Three edits:
   - `const { version: pkgVersion } = pkgJSON` becomes `const { name: pkgName, version: pkgVersion } = pkgJSON`.
   - `import { builtinPluginsFor } from './builtin-plugins'` and, at module scope, `const builtinPlugins = builtinPluginsFor({ npmName: pkgName, version: pkgVersion })`.
   - `builtinPlugins,` added to the `superInit({ ... })` argument object, **before** the `...options` spread — the same position and rationale as every other default there, so a caller (including a test) can still override it.

   `pkgName` is read from `package.json` rather than hardcoded, so the identity follows the package if it is ever renamed. `summary` cannot come from `package.json` (its `description` is the empty string) and stays a literal in `builtin-plugins.mjs`. Do **not** import the near-identical `summary` constant from `src/lib/index.js` — that would create an `index.js → app-init.mjs → index.js` cycle; the duplication is deliberate and consolidating it is a follow-up, not part of this task.

4. **Prove the path with a test-injected probe, not a shipped one.** The probe must **not** become part of the production `submodules` array — a permanently-registered probe would add a phantom route to every baseline snapshot and to the published server. Instead, place a probe module under a test fixture path (e.g. `src/lib/test/fixtures/probe-plugin.mjs`) and inject it through the `builtinPlugins` **option override** that requirement 3's argument ordering makes possible.

   The probe must exercise, in one `appInit()`:
   - a `setup` that captures and asserts the **exact five-member** argument object it receives: `app`, `cache`, `reporter`, `registerPathVar`, `serverConfigRoot` — asserting `serverConfigRoot` equals `app.ext.serverConfigRoot` and that `registerPathVar` is a callable function;
   - a successful `registerPathVar('<probeVar>', ...)` call with an `optionsFetcher`;
   - a setup method pushed onto `app.ext.setupMethods` that actually runs to completion under `DependencyRunner` (use no `deps`, or a `deps` entry that is definitely satisfiable in the harness's configuration);
   - a registered route consuming the probe's path variable, served successfully via `supertest`;
   - a second registered route that **throws**, whose response is asserted to match the **server's own** error-handling shape — status, `content-type`, and body shape — compared against an equivalent error from an existing `plugable-express` core route, **not** against a hand-written expectation. This is the single most important assertion in the task: it is the direct proof that builtin handlers land in `app.ext.pendingHandlers` before the error middleware is installed, which is the entire reason this mechanism exists instead of post-`appInit` registration;
   - presence of the probe's routes in the written API spec (`GET /server/api`, and the `apiSpecPath` file if the harness writes one), proving the spec write still happens after builtin registration;
   - a `handlerPlugins` entry carrying the probe's `npmName`, `summary`, and `version` verbatim — in particular that `summary` is **not** run through the `" for a @liquid-labs/plugable-express server"` stripping regex the npm path applies to a package `description`.

   Run the probe test in a configuration where builtins actually register — `skipCorePlugins` absent, i.e. the same full-tier configuration Phase 3's harness already proved works, with `PLUGABLE_PLAYGROUND` isolation and a temp `serverConfigRoot`. A narrower configuration is acceptable if the implementer verifies it registers builtins and reports how; do not assume `explicitPlugins: []` behaves as expected without checking.

5. **Prove the gating, negatively.** Add an assertion that a `builtinPlugins` entry whose `setup` sets a sentinel is **not** run under `skipCorePlugins: true`. This is cheap (it needs no core scan, precisely because the flag is true) and it is the observable that `app-init.test.js` and `golden-api-spec.test.js` implicitly depend on.

6. **Confirm the existing tests pass with zero edits.** `src/lib/test/app-init.test.js` and `src/lib/test/golden-api-spec.test.js` must be **unmodified**, and `test/__snapshots__/golden-api-spec.json` (35 entries) and `golden-plugins-list.json` (`[]`) must be **byte-identical**. With an empty `submodules` array this is doubly guaranteed, but assert it anyway — it is the property Phase 5 must preserve.

7. **Confirm the bundle.** After `make build`: `dist/sdlcforge-server.js` contains the aggregator's code inlined (relative specifiers are never externalized by `nodeExternals()`), `dist/sdlcforge-server-exec.js` is produced with its shebang intact and **actually starts** (`bun run test:local` exercises a really-started server), and no new bare-specifier `require(...)` appears in `dist/sdlcforge-server.js` that is absent from `package.json`'s `dependencies`. Record the bundle size against the figure task 002 established.

8. **Full-tier snapshots must still compare green without regeneration.** With an empty `submodules` array, the one legitimate change is a **new `@sdlcforge/core-server` entry in `full-tier-plugins-list.json`** — `handlerPlugins` gains the builtin entry even though it contributes zero handlers, taking the list from 11 to 12. Regenerate **only** that snapshot, state the diff explicitly in the report, and confirm `full-tier-api-spec.json` (165 entries) and `full-tier-integrations-list.json` are untouched. Any other snapshot movement is a finding, not a regeneration.

## Validation

- `make build`, `make test`, `make lint`, and `bun run test:local` are all green.
- `git diff` confirms `src/lib/test/app-init.test.js`, `src/lib/test/golden-api-spec.test.js`, `test/__snapshots__/golden-api-spec.json`, and `test/__snapshots__/golden-plugins-list.json` are all unchanged.
- `git diff` confirms `test/__snapshots__/full-tier-api-spec.json` and `full-tier-integrations-list.json` are unchanged, and that the only change to `full-tier-plugins-list.json` is the single added `@sdlcforge/core-server` entry (11 → 12).
- `src/lib/app-init.mjs`'s `explicitPlugins` array still holds all eleven entries, and `package.json`'s `dependencies` still lists all three donors. This task removes nothing.
- No directory named `src/controls/`, `src/credentials/`, or `src/integrations-issues-github/` exists; `builtin-plugins.mjs`'s `submodules` array is empty.
- The error-shape assertion (requirement 4) is present and demonstrably meaningful: temporarily move the builtin registration to after `appInit` returns, observe the assertion fail, and restore. Report that this check was performed.
- `grep -n 'file:' package.json` shows exactly the two pre-existing entries.

## Metadata

architectural_impact: true

## Assumptions

- Tasks 001 and 002 have both passed; `.yalc/@liquid-labs/plugable-express` carries the `builtinPlugins` affordance and `bun.lock` has been regenerated against it.
- `builtinPlugins` is suppressed by `skipCorePlugins: true`. This is settled framework behavior verified by task 001; requirement 5 asserts it from `core-server`'s side as well.
- Rollup's default resolution already handles `.mjs` and directory-index specifiers here — `@rollup/plugin-node-resolve`'s extension list leads with `.mjs` and `@rollup/plugin-babel`'s includes it, with the existing `src/lib/index.js` → `app-init.mjs` chain as the in-repo proof. No build-config change should be needed; if one appears to be, report it rather than making it silently.

## References

- [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#the-core-server-change) — the proposed source for `builtin-plugins.mjs` and the three `app-init.mjs` edits, verbatim.
- [`plan/notes/in-tree-plugin-registration.md`](../notes/in-tree-plugin-registration.md#6-bundling--confirmed-safe-one-real-hazard-which-is-about-packagejson-not-rollup) — the bundling analysis and the undeclared-dependency hazard requirement 7 checks for.
- [`plan/notes/plugin-list-visibility.md`](../notes/plugin-list-visibility.md) — the identity decision behind the single-entry `builtinPluginsFor` shape.
- `src/lib/app-init.mjs` — the file being wired; note the existing `...options`-spread convention the new default must follow.

## Checkpoint hints

- After `src/lib/builtin-plugins.mjs` is created and `make build` succeeds with it in the graph.
- After `src/lib/app-init.mjs` is wired and the existing suite passes unchanged.
- After the probe fixture and the positive-path probe test are green.
- After the error-middleware-shape assertion and the negative gating assertion are added.
- After `make build` plus the bundle and `dist/sdlcforge-server-exec.js` start checks.
