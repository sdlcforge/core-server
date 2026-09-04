/* global describe expect test */
import { readHostDeclaration, resolvePluginManifest, validatePluginGraph } from '@liquid-labs/plugable-express'

import { readCoreServerPackageJSON, resolveCoreServerPackageRoot } from './helpers/resolve-plugin-set'

// Regression coverage for the "absorbed donor" hazard: `@liquid-labs/liq-controls`,
// `@liquid-labs/liq-credentials`, and `@liquid-labs/liq-integrations-issues-github` were absorbed in-tree
// (see `src/lib/app-init.mjs:40-51`) and no longer exist as separate installable packages -- their real
// functionality is `src/controls/`, `src/credentials/`, and `src/integrations-issues-github/`. Re-introducing
// any one of them (e.g. a stray `explicitPlugins`/dependency re-add) duplicates a real, already-registered
// capability. Two of the three fail late and cryptically at boot today (`Non-unique command path: <path>`,
// `Path variable 'credential' is already registered.`); the third (`liq-integrations-issues-github`) fails
// *silently and permanently* -- its two integration providers simply register twice, with nothing anywhere to
// catch it. This test proves the plugin-graph engine catches all three, as a build-time-detected `conflict`
// finding, before any of that runtime side effect.
//
// Because none of the three donors is actually installed (there is nothing in `node_modules` to load), this
// test cannot call `validatePluginSet()`'s real resolver -- it builds one synthetic donor record per donor
// directly from `@liquid-labs/plugable-express`'s exported `resolvePluginManifest()`, the same plugin-manifest
// reader `validatePluginSet()`'s own resolver calls internally, and combines it with the real, live
// `plugable.host.builtins` declarations (via the exported `readHostDeclaration()`) using the exported
// `validatePluginGraph()` engine directly. This deliberately bypasses the unexported, internal
// `resolvePluginSet`/static-plugin-set-resolver machinery `validatePluginSet()` composes (which walks
// `node_modules` and would find nothing for a donor that isn't installed) in favor of the three functions
// `@liquid-labs/plugable-express` actually exports for this purpose, per the task's own constraint against
// reading from real `node_modules`.
describe('plugin graph: absorbed donor re-introduction is a detected conflict', () => {
  const packageRoot = resolveCoreServerPackageRoot(__dirname)
  const pkg = readCoreServerPackageJSON(packageRoot)
  const hostDeclaration = readHostDeclaration(pkg, { dir : packageRoot })

  if (hostDeclaration.builtins.length === 0) {
    throw new Error(
      "package.json's plugable.host.builtins is empty -- Phase 2's in-tree component declarations "
      + '(controls/credentials/issues-github) are expected to be landed by the time this task runs.'
    )
  }

  // One synthetic donor case per absorbed package, each targeting the specific real in-tree provide whose
  // duplication is `exclusive: true` (a `pathVar:`/`setupMethod:` capability) and therefore detected as
  // `conflict` -- never an `integration:`/`integrationHook:` provide alone, which defaults to
  // `exclusive: false` and would produce no finding at all (this is exactly the shape that makes
  // `liq-integrations-issues-github`'s real-world double-load silent today).
  const cases = [
    {
      donorNpmName         : '@liquid-labs/liq-credentials',
      collidingCapability  : 'pathVar:credential',
      realProviderNodeId   : '@sdlcforge/core-server#credentials',
      // `pathVar:` duplication is caught only by the engine's general provider-index-based
      // conflict detector -- exactly one finding.
      expectedFindingCount : 1
    },
    {
      donorNpmName         : '@liquid-labs/liq-controls',
      collidingCapability  : 'setupMethod:load org controls',
      realProviderNodeId   : '@sdlcforge/core-server#controls',
      // `setupMethod:` duplication is caught twice: once by the general conflict detector, once
      // by the setup-queue model's own duplicate-setup-method-name detector -- exactly two.
      expectedFindingCount : 2
    },
    {
      donorNpmName         : '@liquid-labs/liq-integrations-issues-github',
      collidingCapability  : 'setupMethod:register github issues integrations',
      realProviderNodeId   : '@sdlcforge/core-server#issues-github',
      expectedFindingCount : 2
    }
  ]

  test.each(cases)(
    're-introducing $donorNpmName duplicates $collidingCapability as a conflict finding',
    ({ donorNpmName, collidingCapability, realProviderNodeId, expectedFindingCount }) => {
      // A minimal, in-memory synthetic donor `pkg`, carrying a package.json-block-form `plugable` declaration --
      // the same form `resolvePluginManifest` reads for any ordinary plugin. `dir` does not need to exist on
      // disk: `resolvePluginManifest` only calls `existsSync(path.join(dir, 'plugable.yaml'))` to check for the
      // file-form manifest, and a nonexistent path simply resolves that check to `false`, falling through to
      // the package-block reader since the synthetic `pkg.plugable` is present.
      const donorPkg = {
        name     : donorNpmName,
        plugable : {
          plugableManifestVersion : 1,
          provides                : [collidingCapability]
        }
      }

      const donorRecords = resolvePluginManifest({
        dir    : '/nonexistent/synthetic-donor-dir',
        pkg    : donorPkg,
        // Matches how each donor was really loaded, as an `explicitPlugins` entry, before absorption.
        source : 'serverPackageRoot'
      })

      expect(donorRecords).toHaveLength(1)
      expect(donorRecords[0].diagnostics).toEqual([])

      const result = validatePluginGraph({ records : [...hostDeclaration.builtins, ...donorRecords] })

      expect(result.ok).toBe(false)

      const collidingFindings = result.findings.filter((finding) => finding.capability?.full === collidingCapability)

      // No `exclusivity-disagreement` finding must be produced -- that would mean the two providers' `exclusive`
      // flags disagree, which would mean this test picked the wrong donor `provides` entry or got the real
      // component's `exclusive` value wrong (re-check against `docs/plugin-manifest-schema.md`'s reserved-kinds
      // table rather than loosening this check).
      expect(collidingFindings.every((finding) => finding.kind === 'conflict')).toBe(true)

      // A `pathVar:` capability (the `liq-credentials` case) surfaces exactly one `conflict` finding, from the
      // engine's general provider-index-based conflict detector (`plugin-graph/conflicts.js`). A `setupMethod:`
      // capability (the `liq-controls`/`liq-integrations-issues-github` cases) surfaces a SECOND, independent
      // `conflict` finding on top of that one, from the setup-queue model's own duplicate-setup-method-name
      // detector (`plugin-graph/setup-queue-model.js#findDuplicateNameConflicts`) -- `setupMethod:` capabilities
      // are tracked by bare name in `DependencyRunner`'s own setup queue, a second, independent place a
      // duplicate is caught. Both findings are real and correct, not a bug in this test. Asserting the exact,
      // kind-specific count (rather than a bare lower bound) means a future, unrelated third detector firing on
      // the same capability would fail this test rather than pass silently.
      expect(collidingFindings.length).toBe(expectedFindingCount)
      for (const finding of collidingFindings) {
        const providerNodeIds = finding.providers.map((provider) => provider.nodeId)

        expect(providerNodeIds).toEqual(expect.arrayContaining([realProviderNodeId, donorNpmName]))
        expect(providerNodeIds).toHaveLength(2)
      }
    }
  )
})
