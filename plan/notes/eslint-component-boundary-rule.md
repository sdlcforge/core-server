# ESLint Component Boundary Rule

## Purpose and scope

Settles the mechanics behind Phase 5 (`component-boundary-hardening`) goal 1 and goal 4: which ESLint rule expresses "no cross-component imports" across the merged seven-component `src/` tree, where the rule can live without hand-editing a Catalyst-generated file, and whether either component set already violates the boundary today.

Everything below was **executed**, not reasoned about. The method was a throwaway lab at `<scratch>/lint-lab/` holding a verbatim copy of `core-server/src/` plus verbatim copies of `dev-core/src/{projects,orgs,work,projects-audit}/`, a symlink to `core-server/node_modules`, and a `src/lib/builtin-plugins.mjs` edited to import all seven components — i.e. the post-Phase-3 tree, standable today. `core-server` itself was not modified. Every claim marked *verified* below came out of an actual ESLint run against that tree.

## 1. How `bun run lint` resolves to a config

The chain is four hops, and it ends inside `node_modules`:

```text
package.json "lint": "make lint"
  → make/95-final-targets.mk      lint: $(LINT_TARGETS)
  → make/55-lint.mk               $(CATALYST_LINT_REPORT) recipe:
                                    npx eslint --config $(CATALYST_ESLINT_CONFIG) \
                                      --ext .cjs,.js,.mjs,.cjs,.xjs \
                                      --ignore-pattern 'dist/**/*' \
                                      --ignore-pattern 'test-staging/**/*' .
  → make/10-resources.mk          CATALYST_ESLINT_CONFIG := $(shell npm explore \
                                    @liquid-labs/catalyst-resource-eslint -- pwd)/dist/eslint.config.js
```

Resolved absolute path: `/Users/zane/playground/sdlcforge/core-server/node_modules/@liquid-labs/catalyst-resource-eslint/dist/eslint.config.js`.

**It is a legacy eslintrc config despite the flat-config-looking filename.** The file is CommonJS and exports `{ parser, parserOptions, extends: ['standard', 'eslint:recommended'], env, plugins: [], rules }` — an `.eslintrc`-shaped object. There is no `eslint.config.js` at `core-server`'s repo root, none in any ancestor directory, and no `.eslintrc.*` anywhere in the project or above it (checked `/Users/zane/playground`, `/Users/zane`, `/`). Installed ESLint is **8.57.1**, and `shouldUseFlatConfig()` in `node_modules/eslint/lib/eslint/flat-eslint.js:1136-1150` flips to flat mode only when `ESLINT_USE_FLAT_CONFIG` is set or a flat config file is found from cwd. Neither holds, so **ESLint runs in eslintrc mode**. `--ext` (removed in flat mode) working today is independent confirmation.

`core-server` has **no project-local ESLint config file of any kind**. The Catalyst config in `node_modules` is the whole ruleset.

Two consequences worth carrying forward:

- `eslint-plugin-import` is installed (**2.32.0**) and its plugin is registered — not through the Catalyst config's empty `plugins: []`, but through `extends: ['standard']`, which is why the Catalyst config can and does configure `import/export` and `import/extensions`. `import/no-restricted-paths` is therefore available with no new dependency.
- Module resolution uses the default `node` resolver (`eslint-import-resolver-node@0.3.10`), whose default extensions are `['.mjs', '.js', '.json', '.node']`. `.mjs` is included, which is load-bearing for point 3.

## 2. The composable path: a project-local `.eslintrc.cjs`, no makefile change at all

**Catalyst does not generate or overwrite any ESLint config in a consuming project.** `.catalyst-data.yaml` is the authoritative list of what the builders write, and it names exactly ten paths: `Makefile` and nine `make/*.mk` fragments. No `.eslintrc*`, no `eslint.config.*`. Grepping the installed `@liquid-labs/catalyst-*` packages for `eslintrc` returns nothing. `make/56-plugin-graph.mk` is correctly absent from that list, which is precisely the convention its own header describes.

That leaves a cleaner option than the one Phase 5's summary anticipated, and it was **verified**:

> In eslintrc mode, `--config` is **additive**, not replacing. ESLint merges the `--config` file on top of the `.eslintrc.*` cascade it finds normally (only `--no-eslintrc`, which `make/55-lint.mk` does not pass, suppresses the cascade).

Verified by running the exact `make/55-lint.mk` invocation against the lab tree with a project-local `.eslintrc.cjs` present: **both** rulesets fired in one run — `no-undef` from the Catalyst config's `eslint:recommended`, and `import/no-restricted-paths` from the local file. Also verified: `root: true` in the local file does **not** suppress the `--config` layer (it only stops the ancestor cascade), and restating `plugins: ['import']` locally alongside `standard`'s own declaration is accepted, not a redefinition error.

So the recommended wiring is:

- **Add `.eslintrc.cjs` at the repo root. Change nothing else.** No new `make/*.mk` fragment, no edit to `make/55-lint.mk` or `make/10-resources.mk`, no vendored copy of the Catalyst config. Phase 5's stated output "build wiring that selects it, hand-authored in the `make/56-*` style" turns out to be unnecessary — the wiring already selects it.

The `make/56-*` precedent still matters as a *shape* — hand-authored, no generated-by banner, an in-file note explaining why — and the proposed `.eslintrc.cjs` carries that note in its header comment. It simply does not need a makefile fragment to be reached.

### Fallback, if the additive-cascade behaviour is ever lost

Also verified, in case a future Catalyst bump moves to ESLint 9 / flat config: a hand-authored `make/56-lint-boundary.mk` **can** redirect the lint invocation, because `include make/*.mk` globs alphabetically (55 before 56) and make expands recipe variables at execution time, after all fragments are read. A one-line `CATALYST_ESLINT_CONFIG := $(CURDIR)/eslint-project.config.cjs` in `make/56-*` demonstrably wins over `make/10-resources.mk`'s assignment — tested against a minimal reproduction of this repo's `Makefile`/`make/` structure. That local config would then have to `require()` the Catalyst config and spread it, i.e. it *replaces* and re-layers rather than layering. Strictly worse than the `.eslintrc.cjs` route (it silently diverges the moment Catalyst's own config changes), so it is a fallback, not the plan.

### Two ways this can be silently or loudly broken

- **Loud (acceptable).** If anyone adds an `eslint.config.js` at the repo root — or in any ancestor directory — ESLint 8.57 auto-flips to flat mode, `.eslintrc.cjs` becomes inert, `--config` gets handed an eslintrc-shaped object it cannot validate, and `--ext` is rejected outright. `make lint` fails hard. Nothing passes silently unenforced.
- **Silent (guard against it).** A future ESLint 9 upgrade inside `catalyst-resource-eslint` that also ships a real flat config would make `.eslintrc.cjs` inert while the run still succeeds. Cheap insurance, and it also satisfies Phase 5's "demonstrated, not assumed" output: a Jest liveness guard. **Verified working**:

  ```js
  const { ESLint } = require('eslint')
  const eslint = new ESLint({ cwd : PKG_ROOT, overrideConfigFile : CATALYST_CONFIG, useEslintrc : true })
  const results = await eslint.lintText(
    "import { Organization } from '../orgs/resources/organization'\n",
    { filePath : `${PKG_ROOT}/src/controls/__boundary-probe__.mjs` }
  )
  // assert results carry an `import/no-restricted-paths` message
  ```

  The probe file need not exist on disk. `CATALYST_CONFIG` is resolvable from Node as `require.resolve('@liquid-labs/catalyst-resource-eslint/dist/eslint.config.js')`, mirroring what the makefile computes via `npm explore`. A companion assertion in the same test should compare the config's exported component list against the actual directory set under `src/` (minus `lib` and `cli`), so adding an eighth component without adding it to the rule fails the test rather than going unenforced.

## 3. The rule: `import/no-restricted-paths`, seven zones

`no-restricted-imports` with `patterns` is the **wrong** tool here, and not marginally so. It matches the specifier *text*. Component names recur as ordinary nested directory names inside other components:

- `src/controls/handlers/orgs/` and `src/controls/handlers/orgs/controls/` (existing, `core-server`)
- `src/work/handlers/projects/` and `src/work/handlers/issues/` (existing, `dev-core`)

A pattern like `**/orgs/**` or `../orgs/*` flags `src/controls/handlers/index.js:1`'s entirely legitimate `export * from './orgs'`. Phase 5's own success condition — "a rule that produces even one false positive against existing, correct code will be worked around rather than fixed" — rules that family out.

`import/no-restricted-paths` matches on the **resolved absolute path** of the import target (`no-restricted-paths.js:220`, `resolve(importPath, context)`), and its zones apply only to files inside the zone's own `target` (`no-restricted-paths.js:90-93`). Both properties are exactly what this boundary needs.

### Proposed `.eslintrc.cjs` (repo root, complete file)

This is the literal file. It was run through the Catalyst config itself and produces **zero lint findings of its own** — the `/* eslint-env node */` directive is required (the Catalyst config sets no `node` env, so `require`/`module`/`__dirname` would otherwise be `no-undef`), and the formatting already conforms to Catalyst's `key-spacing` colon alignment, `indent`, and `space-before-function-paren` rules.

```js
/* eslint-env node */
// Hand-authored, NOT Catalyst-generated. Catalyst regenerates `Makefile` and the banner-carrying
// `make/*.mk` fragments listed in `.catalyst-data.yaml`; it has never written an ESLint config
// into a consuming project, so this file is safe to hand-edit and will not be overwritten.
//
// `make/55-lint.mk` invokes `eslint --config $(CATALYST_ESLINT_CONFIG) ... .` from the repo root.
// ESLint 8 is in eslintrc mode here (no `eslint.config.js` in cwd or above it), and in that mode
// `--config` is ADDITIVE: the file it names is merged on top of the `.eslintrc.*` cascade rather
// than replacing it. So this file layers a project-specific rule onto the Catalyst ruleset
// without touching either the generated makefile fragment or the config inside `node_modules`.
//
// `import/no-restricted-paths` comes from `eslint-plugin-import`, which the Catalyst config
// already pulls in via `extends: ['standard']` (it configures `import/export` and
// `import/extensions` itself). `plugins: ['import']` is restated below so this file is
// self-sufficient rather than silently dependent on that; eslintrc tolerates the duplicate.

const path = require('node:path')

// Directory names under `src/`, one per in-tree component. NOT the manifest component names:
// `package.json`'s `plugable.host.builtins[0].components` calls the third one `issues-github`,
// while its directory is `integrations-issues-github`. Listed in the declared load order so this
// array reads against that one; order is irrelevant to the rule itself.
//
// Adding an eighth component means adding it here. `src/lib/test/component-boundary.test.js`
// asserts this list equals the actual set of component directories, so a forgotten entry fails
// the test rather than silently going unenforced.
const COMPONENT_DIRS = [
  'credentials',
  'projects',
  'orgs',
  'controls',
  'integrations-issues-github',
  'work',
  'projects-audit'
]

// One zone per component: "files under `src/<c>/` may not import anything under any *other*
// `src/<other>/`". Two properties of `import/no-restricted-paths` make this exactly right:
//
// 1. It matches on the RESOLVED absolute path of the import target, not on the specifier text.
//    That is essential here, because component names recur as ordinary nested directory names:
//    `src/controls/handlers/orgs/`, `src/controls/handlers/orgs/controls/`, and
//    `src/work/handlers/projects/` all exist. A specifier-glob rule (`no-restricted-imports`
//    with `patterns`) would flag `src/controls/handlers/index.js`'s legitimate
//    `export * from './orgs'`. This one does not.
// 2. Zones only apply to files inside their own `target`. `src/lib/builtin-plugins.mjs` is not
//    inside any component directory, so no zone matches it and its seven aggregation imports are
//    exempt structurally -- there is no allowlist to maintain, and the same holds for
//    `src/lib/test/builtin-plugins.test.js` and anything else under `src/lib/` or `src/cli/`.
//
// `target`/`from` must stay plain directory paths, never globs. The rule switches to minimatch
// semantics the moment `is-glob` says any `from` entry is a glob, and a zone mixing the two
// degrades to `isPathRestricted: () => true` -- every import in the zone reported.
const zones = COMPONENT_DIRS.map((component) => ({
  target  : path.join('src', component),
  from    : COMPONENT_DIRS.filter((other) => other !== component).map((other) => path.join('src', other)),
  message : `Cross-component import: 'src/${component}/' may not reach into a sibling component. `
    + 'Components share one package but not one namespace; they couple only through runtime '
    + 'app.ext state and the capabilities declared in package.json\'s '
    + 'plugable.host.builtins[0].components, never through module paths. Shared code belongs in '
    + 'an @liquid-labs/* library imported by bare specifier.'
}))

module.exports = {
  // Stops the cascade at the repo root so a stray `.eslintrc.*` in a developer's parent
  // directory cannot alter this project's lint. Does not affect `--config`, which ESLint applies
  // independently of the cascade.
  root    : true,
  plugins : ['import'],
  rules   : {
    // `basePath` is `__dirname`, not the default `process.cwd()`: the zone paths must mean the
    // same thing whether `eslint` is invoked from the repo root (as `make lint` does) or from a
    // subdirectory or an editor integration.
    'import/no-restricted-paths' : ['error', { basePath : __dirname, zones }]
  }
}
```

### Why one zone per component, not one zone listing all seven

`from` accepts an array, and the rule builds **one validator per `from` entry**, reporting if *any* matches (`no-restricted-paths.js:207-214`, `231-238`). A single zone with `target: [all seven]` and `from: [all seven]` would therefore flag every within-component import, since a file's own component is in its own `from` list. Seven zones, each excluding its own directory from `from`, is the shape that works.

### `src/lib/builtin-plugins.mjs` is exempt structurally — verified, not asserted

The task asked not to take this on faith, so it was tested two ways.

A **negative** test alone would be worthless: the rule silently does nothing when `resolve()` fails (`no-restricted-paths.js:222-224`), so "no findings" could equally mean "the imports never resolved." So a **positive probe** was run first: a temporary extra zone with `target: 'src/lib'` and `from: [all seven components]`. It reported all seven of `builtin-plugins.mjs`'s imports plus the three in `src/lib/test/builtin-plugins.test.js`:

```text
src/lib/builtin-plugins.mjs:40 [import/no-restricted-paths] Unexpected path "../controls" ...
src/lib/builtin-plugins.mjs:41 ... "../credentials"
src/lib/builtin-plugins.mjs:42 ... "../integrations-issues-github"
src/lib/builtin-plugins.mjs:43 ... "../projects"
src/lib/builtin-plugins.mjs:44 ... "../orgs"
src/lib/builtin-plugins.mjs:45 ... "../work"
src/lib/builtin-plugins.mjs:46 ... "../projects-audit"
src/lib/test/builtin-plugins.test.js:10-12 ... "../../controls" / "../../credentials" / "../../integrations-issues-github"
```

Every extensionless directory specifier resolves, including `dev-core`'s `.mjs` index files (`../orgs` → `src/orgs/index.mjs`, `../work` → `src/work/index.mjs`, `../projects-audit` → `src/projects-audit/index.mjs`). Independently, running `import/no-unresolved: 'error'` over the whole 201-file merged tree produced **zero** findings — every import edge in the tree is visible to the rule, so there are no silent false negatives anywhere, not just in `src/lib/`.

With the probe zone removed and the real seven-zone config in place, `builtin-plugins.mjs` reports nothing. The exemption is a consequence of `src/lib/` not being any zone's `target`, and it needs no `except` clause, no ignore comment, and no allowlist.

### What the rule catches, and what it correctly leaves alone

Six evasion shapes were planted in `src/controls/probe/evasion.mjs` and **all six were reported**:

| Shape | Example | Caught |
| --- | --- | --- |
| Plain relative into sibling internals | `from '../../orgs/resources/organization'` | yes |
| Leave-and-re-enter | `from '../../../src/orgs/resources/organization'` | yes |
| Sibling's public surface | `import * as o from '../../orgs'` | yes |
| Dynamic `import()` | `() => import('../../work/handlers/_lib/work-db')` | yes |
| CommonJS `require()` | `require('../../work/handlers/_lib/work-db')` | yes |
| `export … from` | `export { doCreate } from '../../projects/handlers/_lib/create-lib'` | yes |

Note the third row: importing a sibling's `index.mjs` public surface is forbidden too. That is the correct reading of the consolidation contract — components couple through `app.ext` and declared capabilities, never through module paths, public or not. If a future task decides a public-surface import should be allowed, that is a deliberate loosening (add the sibling `index` files as zone `except` entries), not an oversight to patch quietly.

In the same file, both legitimate shapes were left alone: a within-component deep import (`from '../resources/controls'`) and a bare shared-library specifier (`from '@liquid-labs/npm-toolkit'`). Bare specifiers are structurally exempt — `resolve()` lands them in `node_modules`, which no zone's `from` contains.

### Optional strengthening, deliberately kept out of the block above

Adding `'src/lib'` and `'src/cli'` to every zone's `from` would additionally forbid a component from reaching into the host's own library — which would also break the `lib → builtin-plugins → component → lib` cycle before it can be written. No component imports `src/lib` today (the only `../lib` import in the tree is `src/cli/index.js:4`, and `src/cli` is not a zone target), so it costs nothing to add. It is called out separately rather than folded in because it enforces a *different* invariant than "components do not import each other," and Phase 5 should adopt it as an explicit decision or not at all.

## 4. Pre-existing violation sweep

### Sweep A — `core-server`'s three in-tree components: **no violations**

Verdict: **clean**. Run with the proposed rule against the real, unmodified `core-server/src/` (as part of the 201-file merged tree): zero `import/no-restricted-paths` findings. Every relative import in `src/controls/`, `src/credentials/`, and `src/integrations-issues-github/` stays within its own component. A hand walk of all 41 relative imports outside `src/lib/` agrees.

Two cases are worth naming because they are exactly what a weaker rule would have gotten wrong:

- `src/controls/handlers/index.js:1` — `export * from './orgs'`. Resolves to `src/controls/handlers/orgs/index.js`, inside the `controls` component. A specifier-pattern rule flags this; the proposed rule does not. Same for `src/controls/handlers/orgs/index.js:1`'s `export * from './controls'`.
- `src/controls/handlers/orgs/controls/_lib/test/list-lib.test.mjs:6` — `import { Controls } from '../../../../../resources/controls'`. Five levels up, then back down: resolves to `src/controls/resources/controls.mjs`, still inside `controls`. A "no `../` escaping the file's directory" heuristic flags this; the proposed rule does not.

### Sweep B — `dev-core`'s four components: **no violations**

Verdict: **clean**. Same run, same result: zero findings across `src/projects/`, `src/orgs/`, `src/work/`, `src/projects-audit/`. `dev-core`'s consolidation contract — "No cross-submodule imports are introduced. The four source packages never imported each other" — holds in the source as written, and the four submodules do not even reach each other through their public `index.mjs` surfaces.

Corroborating detail from reading the source directly: no file under `dev-core/src/` uses a relative specifier deeper than `'../../'`, and every `'../../'` lands inside its own submodule's `handlers/_lib/` (e.g. `src/work/handlers/projects/_lib/add-lib.mjs:3-5` reaching `src/work/handlers/_lib/…`). The only place the four are joined is `dev-core/src/index.mjs:20-23`, which imports `./projects`, `./orgs`, `./work`, `./projects-audit` — and that file is the one absorbed *into* `src/lib/builtin-plugins.mjs` by Phase 3, landing in `src/lib/`, outside every zone. `src/work/handlers/projects/` is a route namespace, not an import of the `projects` component.

### Phase 5 goal 3 is therefore satisfiable with no remediation and no scope escape

Neither component set needs a fix, and no followup needs to be recorded for a pre-existing violation. The rule can be introduced at full strength (`error`, no allowlist, no `except`) on day one.

### Baseline arithmetic for goal 5

Measured on the current tree, running the `make/55-lint.mk` invocation directly (read-only, no `qa/` writes):

| Scope | Findings |
| --- | --- |
| `test/` | 230 |
| `src/` | 3 (`'beforeAll' is not defined`, `src/lib/test/plugin-graph-{gate,serverconfigroot-rename,third-party-ordering}.test.js`) |
| **Standing baseline** | **233** — matches the phase summary's "~233" |
| `plan/` + `worktrees/` | 239 more, an artifact of the plan worktree living inside the repo; absent from a clean checkout |

Running the merged seven-component tree **with** the proposed `.eslintrc.cjs` in place produced exactly those same 3 `src/` findings and nothing else — including when `.eslintrc.cjs` itself was linted (it is picked up by `eslint .` with `--ext .cjs`, and passes clean). **The addition contributes zero new findings**, verified rather than projected.

## Open items for the implementing task

1. Decide the optional `src/lib` / `src/cli` strengthening (see the end of point 3) — adopt explicitly or drop explicitly.
2. Decide whether sibling *public surface* imports stay forbidden (recommended) or become an `except` allowance.
3. Write `src/lib/test/component-boundary.test.js` with the two assertions from point 2: the ESLint-API liveness probe, and component-list-versus-`src/`-directories agreement. Note this is a *third* drift guard alongside the `submodules`-order guard proposed in [`component-order-and-manifest-mechanics.md`](./component-order-and-manifest-mechanics.md); they may share a file.
4. `make/55-lint.mk`'s `--ext .cjs,.js,.mjs,.cjs,.xjs` lists `.cjs` twice. Harmless, generated, out of scope — noted only so nobody "fixes" a generated fragment.

## Related documents

- [`../phases/component-boundary-hardening.md`](../phases/component-boundary-hardening.md) — the phase this research unblocks.
- [`component-order-and-manifest-mechanics.md`](./component-order-and-manifest-mechanics.md) — the component directory-versus-manifest-name distinction the rule's `COMPONENT_DIRS` list depends on.
- [`pre-merge-state.md`](./pre-merge-state.md) — the measured baseline this sweep extends.
