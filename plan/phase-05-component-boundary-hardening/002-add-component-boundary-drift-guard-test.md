# Add Component Boundary Drift Guard Test

## Purpose and scope

Adds `src/lib/test/component-boundary.test.js`, a Jest guard against the component-boundary rule going silently inert — the failure mode that matters most, since a loud break (an `eslint.config.js` appearing and flipping ESLint to flat mode) already fails `make lint` hard on its own, but a future ESLint 9 upgrade inside `catalyst-resource-eslint` shipping a real flat config would make `.eslintrc.cjs` inert while the run still succeeds silently. This task depends on [`001-add-component-boundary-eslint-config.md`](./001-add-component-boundary-eslint-config.md) — the liveness probe below lints against the repo's real `.eslintrc.cjs`, which must exist first.

No dedicated skill covers authoring this test; follow the [Procedure](#procedure) below.

## Requirements

`role_doc: plugins/flow/roles/developer-node.md`

Write `src/lib/test/component-boundary.test.js` with two assertions, both verified workable in [`plan/notes/eslint-component-boundary-rule.md`](../notes/eslint-component-boundary-rule.md) section 2 ("Two ways this can be silently or loudly broken") and section "Open items for the implementing task":

1. **Liveness probe.** Using the ESLint Node API, lint an in-memory cross-component import and assert an `import/no-restricted-paths` message comes back:

   ```js
   const { ESLint } = require('eslint')
   const eslint = new ESLint({ cwd: PKG_ROOT, overrideConfigFile: CATALYST_CONFIG, useEslintrc: true })
   const results = await eslint.lintText(
     "import { Organization } from '../orgs/resources/organization'\n",
     { filePath: `${PKG_ROOT}/src/controls/__boundary-probe__.mjs` }
   )
   // assert results carry an `import/no-restricted-paths` message
   ```

   The probe file need not exist on disk. `PKG_ROOT` is the repo root (e.g. `path.resolve(__dirname, '../../..')` from `src/lib/test/`). `CATALYST_CONFIG` is resolvable from Node as `require.resolve('@liquid-labs/catalyst-resource-eslint/dist/eslint.config.js')`, mirroring what `make/10-resources.mk` computes via `npm explore`. `useEslintrc: true` is what makes the ESLint API pick up the repo-root `.eslintrc.cjs` via the normal cascade, additively layered under `overrideConfigFile`, matching the real `make lint` invocation's behavior.

2. **Drift assertion.** Compare `.eslintrc.cjs`'s exported `COMPONENT_DIRS` list (`.eslintrc.cjs`'s `module.exports.rules['import/no-restricted-paths'][1].zones` does not itself expose the list directly — either `require('../../../.eslintrc.cjs')` and re-derive the component set from the zones' `target` values, or refactor `.eslintrc.cjs` to export `COMPONENT_DIRS` alongside `module.exports` so the test can import it directly; prefer the latter for directness, adding a named export without changing the default `module.exports` config shape) against the actual set of directories under `src/` excluding `lib` and `cli`. Fail the test if they disagree in either direction (a directory present on disk but missing from the list, or a listed entry with no corresponding directory).

This is a *third* drift guard alongside Phase 3's component-order-versus-manifest assertion (see [`plan/notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md)) and any prior submodule-order guard in `src/lib/test/`; check whether an existing test file (e.g. `src/lib/test/builtin-plugins.test.js` or similar) is a natural home to extend instead of adding a new file, but default to the new file named in Outputs if no clearly-better existing home exists, since the phase's stated output names this exact path.

## Validation

1. `src/lib/test/component-boundary.test.js` exists and `bun run test` (or the project's Jest invocation) passes it along with the rest of the existing suite — no regressions in other test files.
2. Temporarily break the liveness probe's premise (e.g. rename or comment out `.eslintrc.cjs` at the repo root, or point `overrideConfigFile` at only the Catalyst config with `useEslintrc: false`) and confirm the liveness assertion fails as expected; then restore and confirm it passes again. This demonstrates the guard actually guards rather than vacuously passing.
3. Temporarily remove one entry from `.eslintrc.cjs`'s `COMPONENT_DIRS` (or temporarily create an extra throwaway directory under `src/`) and confirm the drift assertion fails; then revert and confirm it passes again.
4. `bun run lint` findings remain at the standing baseline after this file is added — the new test file itself introduces no lint findings. **Correction (2026-09-08): the baseline is 231 (1 in `src/`, 230 in `test/`), not 233/3/230** — Phase 4 task 004 cleared 2 of the 3 `src/` findings this document originally cited; see task 001's document for the same correction. Reproduce against 231.
5. `git diff --stat` shows exactly one new file, `src/lib/test/component-boundary.test.js` (plus any refactor to `.eslintrc.cjs` needed to export `COMPONENT_DIRS`, if that approach was chosen, and this task document's own edits under `plan/`).

## Procedure

1. Confirm `.eslintrc.cjs` exists at the repo root (from the prerequisite task) before starting.
2. Read [`plan/notes/eslint-component-boundary-rule.md`](../notes/eslint-component-boundary-rule.md) section 2's liveness-probe code and the "Open items" note on the drift assertion.
3. Decide the `COMPONENT_DIRS` export approach from Requirements point 2 (re-derive from zones vs. add a named export to `.eslintrc.cjs`) and implement it.
4. Write `src/lib/test/component-boundary.test.js` with both assertions.
5. Run the negative-control checks in Validation steps 2 and 3 (break each assertion in turn, confirm it fails, then revert and confirm it passes).
6. Run the full test suite and `bun run lint` to confirm no regressions or new findings.
7. Commit the new test file (and any `.eslintrc.cjs` export refactor) together.

## Metadata

architectural_impact: false

## References

- [`001-add-component-boundary-eslint-config.md`](./001-add-component-boundary-eslint-config.md) — prerequisite task; this test lints against the `.eslintrc.cjs` it adds.
- [`plan/notes/eslint-component-boundary-rule.md`](../notes/eslint-component-boundary-rule.md) — section 2's liveness-probe code (verified working) and the drift-assertion rationale; authoritative for this task.
- [`plan/notes/component-order-and-manifest-mechanics.md`](../notes/component-order-and-manifest-mechanics.md) — the sibling drift guard (component order vs. manifest) this test file may share a home with.
- [`plan/phases/component-boundary-hardening.md`](../phases/component-boundary-hardening.md) — this phase's goals, inputs, and outputs in full.
