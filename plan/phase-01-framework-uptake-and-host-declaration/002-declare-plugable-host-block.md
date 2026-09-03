# Declare Plugable Host Block

## Purpose and scope

Add the `plugable.host` block to `core-server`'s own `package.json`, declaring — as **structure only, with no capability lists populated yet** — the two plugin tiers no scan can discover: the `explicitPlugins` array and the one `builtins` entry aggregating `core-server`'s three in-tree components. This is `core-server`'s side of the upstream `plugable.host` contract ([`docs/plugin-manifest-schema.md`](/Users/zane/playground/liquid-labs/plugable-express/docs/plugin-manifest-schema.md)'s `## The plugable.host block` section, whose own worked JSON example names `@sdlcforge/core-server` by npm name). Populating each component's real `provides`/`requires` is Phase 2's job ([`plan/phases/declare-in-tree-components.md`](../phases/declare-in-tree-components.md)), not this task's.

This task assumes [001](./001-verify-and-refresh-framework-dependencies.md) has already landed: `@liquid-labs/plugable-express` is refreshed and its manifest reader/host-declaration reader are usable for the sanity checks below. If `node_modules/.bin/plugable-express-validate` is absent or `require('@liquid-labs/plugable-express').readHostDeclaration` is undefined, halt and report rather than authoring the block blind.

## Requirements

1. **Re-derive the exact `explicitPlugins` array from real source at task time**, not from this document — `src/lib/app-init.mjs`'s array is the sole source of truth and may have changed again since this task doc was authored:
   ```bash
   grep -n "^const explicitPlugins" -A 10 src/lib/app-init.mjs
   ```
   As of this plan's most recent grounding (2026-09-01, post-`dev-core-consolidation`), that array holds **five** names, in this order:
   ```
   @liquid-labs/sdlc-projects-badges-coverage
   @liquid-labs/sdlc-projects-badges-github-workflows
   @liquid-labs/sdlc-projects-workflow-github-node-jest-cicd
   @liquid-labs/sdlc-projects-workflow-local-node-build
   @sdlcforge/dev-core
   ```
   Do **not** use the eight-name list (`liq-orgs`, `liq-projects`, `liq-work`, `plugable-projects-audit`, plus the four above) that some earlier grounding notes under `plan/notes/` still describe — those four were absorbed into `@sdlcforge/dev-core` by a separate, already-completed plan-group and no longer appear individually. `plugable.host.explicitPlugins`' own normalized form is a plain membership set (order carries no ordering fact per the schema — `findPlugins` returns filesystem scan order, not the array's own order), so array order in the declaration does not need to match `app-init.mjs`'s literal order, but using the same order is clearer for a human diff and costs nothing.

2. **Add the top-level `plugable` block** to `package.json`:
   ```json
   {
     "plugable": {
       "plugableManifestVersion": 1,
       "host": {
         "explicitPlugins": [
           "@liquid-labs/sdlc-projects-badges-coverage",
           "@liquid-labs/sdlc-projects-badges-github-workflows",
           "@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd",
           "@liquid-labs/sdlc-projects-workflow-local-node-build",
           "@sdlcforge/dev-core"
         ],
         "builtins": [
           {
             "npmName": "@sdlcforge/core-server",
             "components": [
               { "component": "controls", "provides": [], "requires": [] },
               { "component": "credentials", "provides": [], "requires": [] },
               { "component": "issues-github", "provides": [], "requires": [] }
             ]
           }
         ],
         "providedCapabilities": [],
         "assumeProvided": [],
         "searchPaths": []
       }
     }
   }
   ```
   `plugableManifestVersion` lives on the surrounding `plugable` object, **not** nested inside `host` — confirm against the schema's own worked example before writing, since the two are easy to transpose.

3. **`builtins[0].components` order must exactly mirror `src/lib/builtin-plugins.mjs`'s `submodules = [controls, credentials, issuesGitHub]` array order** — `controls`, then `credentials`, then `issues-github` (the component name used here is `issues-github`, matching the schema's own worked example for this exact package, not the camelCase `issuesGitHub` import binding). This order is normative load order on both sides and the two must agree; task [003](./003-add-host-declaration-drift-guard.md) is what enforces that agreement going forward — do not skip this task's careful ordering on the assumption the drift guard will "catch it," since a real drift-guard failure right after this task lands would itself look like a defect in this task rather than evidence the guard works.

4. **Leave every component's `provides` and `requires` as empty arrays** — this task declares identity and load order only, never capability semantics. Do not transcribe [`plugin-set-inventory.md`](../notes/plugin-set-inventory.md)'s draft declarations here; that is Phase 2's job, task by task.

5. **Record the `submodules`-to-`components:` derivation relationship**, since it cannot be structurally derived: `package.json` is static data with no computation, and `submodules` order lives in `src/lib/builtin-plugins.mjs` (code) — there is no single mechanism that keeps one authored value expressed once. Add a comment near the `submodules` array in `src/lib/builtin-plugins.mjs` stating plainly that `package.json`'s `plugable.host.builtins[0].components` array must be kept in the same order, and that task 003's `verifyHostDeclaration()` Jest assertion is the enforcement mechanism for that agreement (not a derivation) — a sentence or two is enough; the existing comment block above the `submodules` declaration is the natural place to extend, not a new comment elsewhere.

6. **Sanity-check the shape against the real reader** (do not just eyeball the JSON):
   ```bash
   node -e "
     const { readHostDeclaration } = require('@liquid-labs/plugable-express');
     const pkg = require('./package.json');
     const result = readHostDeclaration(pkg, { dir: '.' });
     console.log(JSON.stringify({ hostDeclared: result.hostDeclared, explicitCount: result.explicitPlugins.size, builtinRecordCount: result.builtins.length, diagnostics: result.diagnostics }, null, 2));
   "
   ```
   Expect `hostDeclared: true`, `explicitCount: 5`, `builtinRecordCount: 3` (one flattened record per component), and an empty (or otherwise-explicable) `diagnostics` array. A non-empty `diagnostics` array naming this block is a defect in this task's edit.

## Validation

- `package.json` remains valid JSON: `node -e "JSON.parse(require('fs').readFileSync('package.json'))"`.
- The sanity-check script in Requirement 6 reports `hostDeclared: true`, `explicitCount: 5`, `builtinRecordCount: 3`, and no diagnostics naming this block.
- `git diff -- package.json` shows only the added `plugable` key — no other `package.json` field changed.
- `src/lib/builtin-plugins.mjs`'s comment now states the `submodules`/`components:` order-agreement relationship and points at the drift guard as its enforcement mechanism.
- No file under `src/controls/`, `src/credentials/`, or `src/integrations-issues-github/` is touched by this task — those are Phase 2's scope.
- `make test` is not expected to newly pass or fail from this task alone (the drift guard does not exist until [003](./003-add-host-declaration-drift-guard.md) lands); existing tests continue to pass unchanged.

## Assumptions

- [001](./001-verify-and-refresh-framework-dependencies.md) has landed: `@liquid-labs/plugable-express` is refreshed, so `readHostDeclaration` and `plugable-express-validate` are usable for this task's own sanity check.
- `src/lib/app-init.mjs`'s `explicitPlugins` array and `src/lib/builtin-plugins.mjs`'s `submodules` array are re-read from real source at task execution time rather than trusted from this document, in case either has changed again since authoring.

## References

- `@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md`, `## The plugable.host block` and `### components:` sections — the normative schema, including the worked JSON example that names `@sdlcforge/core-server` directly.
- [`plan/phases/framework-uptake-and-host-declaration.md`](../phases/framework-uptake-and-host-declaration.md) — this phase's goals/inputs/outputs, updated 2026-09-01 for the corrected five-name `explicitPlugins` figure.
- [`plan/notes/plugin-set-inventory.md`](../notes/plugin-set-inventory.md) — the verified in-tree composition and per-component citations Phase 2 will draw on; its own `explicitPlugins` figure (eight names) is stale and must not be used by this task (see Requirement 1).
- [`plan/notes/2026-09-01-blocker-reverification.md`](../notes/2026-09-01-blocker-reverification.md) — the finding that corrected the `explicitPlugins` count from eight to five.
- `src/lib/app-init.mjs`, `src/lib/builtin-plugins.mjs` — the real arrays this declaration mirrors.

## Status

**Outcome:** succeeded (2026-09-02).

Re-derived `explicitPlugins` directly from `src/lib/app-init.mjs` at task time (5 names, matching this doc's grounding) and `submodules` order directly from `src/lib/builtin-plugins.mjs` (`controls`, `credentials`, `issuesGitHub` — matching this doc's required `controls`/`credentials`/`issues-github` component order). Added the top-level `plugable.host` block to `package.json` per Requirement 2, with all component `provides`/`requires` left empty per Requirement 4. Extended the existing comment block above `src/lib/builtin-plugins.mjs`'s `submodules` declaration (fact 2) to record the order-agreement relationship with `package.json`'s `plugable.host.builtins[0].components`, naming task 003's `verifyHostDeclaration()` Jest assertion as the enforcement mechanism.

Validation:
- `package.json` remains valid JSON — confirmed via `node -e "JSON.parse(...)"`.
- The Requirement 6 sanity-check script reports `hostDeclared: true`, `explicitCount: 5`, `builtinRecordCount: 3`, `diagnostics: []` — exactly as required.
- `git diff -- package.json` shows only the added `plugable` key.
- `src/lib/builtin-plugins.mjs`'s comment now states the order-agreement relationship and points at the drift guard (task 003) as its enforcement mechanism.
- No file under `src/controls/`, `src/credentials/`, or `src/integrations-issues-github/` was touched.
- `make test`: 12 suites / 40 tests, all passing (no drift guard exists yet, as expected).

Affected source files:
- `package.json`
- `src/lib/builtin-plugins.mjs`
