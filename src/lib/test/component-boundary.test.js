/* global describe expect test */
import { readdirSync } from 'node:fs'
import * as fsPath from 'node:path'

import { ESLint } from 'eslint'

import { resolveCoreServerPackageRoot } from './helpers/resolve-plugin-set'

// Guards `plan/phase-05-component-boundary-hardening/001-add-component-boundary-eslint-config.md`'s
// `.eslintrc.cjs` (the `import/no-restricted-paths` cross-component boundary rule) against going
// silently inert. A loud break -- an `eslint.config.js` appearing anywhere from the repo root on
// up -- already fails `make lint` hard on its own (ESLint 8.57 auto-flips to flat mode, `--config`
// gets handed an eslintrc-shaped object it cannot validate, `--ext` is rejected outright). What
// isn't already covered is the silent failure mode: a future ESLint 9 upgrade inside
// `@liquid-labs/catalyst-resource-eslint` that ships a real flat config would make `.eslintrc.cjs`
// inert while `make lint` keeps succeeding. See `plan/notes/eslint-component-boundary-rule.md`
// section 2 ("Two ways this can be silently or loudly broken") for the full rationale -- both
// assertions below are lifted from code verified working there.

// `resolveCoreServerPackageRoot` walks up from this file's own Jest-run-time `__dirname` (which is
// `test-staging/lib/test/`, not `src/lib/test/` -- see `helpers/resolve-plugin-set.mjs`'s own
// header) back to the real repository root, where `.eslintrc.cjs`, `package.json`, and
// `node_modules` all live.
const PKG_ROOT = resolveCoreServerPackageRoot(__dirname)

// Mirrors what `make/10-resources.mk` computes via `npm explore @liquid-labs/catalyst-resource-eslint
// -- pwd`: the Catalyst ruleset `make/55-lint.mk` layers `.eslintrc.cjs` additively underneath via
// `eslint --config`.
const CATALYST_CONFIG = require.resolve('@liquid-labs/catalyst-resource-eslint/dist/eslint.config.js')

describe('component boundary ESLint rule', () => {
  test('liveness: linting a cross-component import surfaces an import/no-restricted-paths finding', async() => {
    // `useEslintrc: true` is what makes the ESLint Node API pick up the repo-root `.eslintrc.cjs`
    // via the normal eslintrc cascade, additively layered under `overrideConfigFile` -- exactly
    // matching the real `make lint` invocation's behavior (`--config` is additive in ESLint 8's
    // eslintrc mode, not replacing). If `.eslintrc.cjs` ever goes inert (e.g. a future flat-config
    // upgrade inside the Catalyst package), this cascade silently stops contributing the rule and
    // this assertion is what catches it -- `make lint` itself would keep succeeding.
    const eslint = new ESLint({ cwd : PKG_ROOT, overrideConfigFile : CATALYST_CONFIG, useEslintrc : true })

    // The probe file need not exist on disk -- `lintText` only needs `filePath` to resolve the
    // import specifier and to pick the right zone (`target`) for the rule.
    const results = await eslint.lintText(
      "import { Organization } from '../orgs/resources/organization'\n",
      { filePath : fsPath.join(PKG_ROOT, 'src', 'controls', '__boundary-probe__.mjs') }
    )

    const messages = results.flatMap(({ messages : fileMessages }) => fileMessages)
    const restrictedPathMessages = messages.filter(({ ruleId }) => ruleId === 'import/no-restricted-paths')

    // Non-vacuous: fail loudly (not just "zero found") if the rule silently stopped firing.
    expect(restrictedPathMessages.length).toBeGreaterThan(0)
  })

  test('drift: .eslintrc.cjs`s COMPONENT_DIRS agrees with the actual component directories under src/', () => {
    // eslint-disable-next-line global-require -- dynamic require of the real repo-root config,
    // resolved at test-run time via PKG_ROOT; a static import cannot express this.
    const { COMPONENT_DIRS } = require(fsPath.join(PKG_ROOT, '.eslintrc.cjs'))

    // `src/lib/` and `src/cli/` are the two non-component siblings the rule's zones deliberately
    // never target (see `.eslintrc.cjs`'s own header comment and
    // `plan/notes/eslint-component-boundary-rule.md` section 3).
    const actualComponentDirs = readdirSync(fsPath.join(PKG_ROOT, 'src'), { withFileTypes : true })
      .filter((entry) => entry.isDirectory())
      .map(({ name }) => name)
      .filter((name) => name !== 'lib' && name !== 'cli')

    // Symmetric-difference comparison via sorted-array equality: fails if a directory exists on
    // disk with no corresponding `COMPONENT_DIRS` entry (an unguarded eighth component) or if
    // `COMPONENT_DIRS` names a directory that no longer exists (a stale entry left behind by a
    // removal). Sorted because `COMPONENT_DIRS`' own order encodes the DAG load order (see
    // `.eslintrc.cjs`'s header comment) and is not meant to match directory-listing order.
    expect([...COMPONENT_DIRS].sort()).toEqual([...actualComponentDirs].sort())
  })
})
