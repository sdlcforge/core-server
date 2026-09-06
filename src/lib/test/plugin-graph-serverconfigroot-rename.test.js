/* global beforeAll describe expect test */
import { FRAMEWORK_MANIFEST, readHostDeclaration, validatePluginGraph } from '@liquid-labs/plugable-express'

import { readCoreServerPackageJSON, resolveCoreServerPackageRoot } from './helpers/resolve-plugin-set'

// Regression coverage for "the 'ynGa' shape" (plan/phases/validation-gate-and-regression.md's Goals):
// the historical bug where a framework rename (`serverHome` -> `serverConfigRoot`) broke four consuming
// packages with no error at rename time and none at load time. This test proves a *future* rename of
// `appExt:serverConfigRoot` / `setupArg:serverConfigRoot` is instead caught at build time as an
// `unsatisfied`(-phase) finding naming `src/credentials/`'s in-tree component and the missing capability,
// with the finding's `supersededBy` field naming the new capability -- the framework's `supersedes:`
// rename-affordance mechanism (`@liquid-labs/plugable-express`'s `docs/plugin-manifest-schema.md`,
// `### supersedes` section) firing correctly, rather than the framework silently returning `undefined`.
//
// This is deliberately scoped to the in-tree (`hostDeclaration.builtins`) half of the graph only. The
// other half of this same rename shape is covered separately by
// `src/lib/test/plugin-graph-third-party-ordering.test.js` against the real, unmodified graph.
const CREDENTIALS_NODE_ID = '@sdlcforge/core-server#credentials'

// The two capabilities the real, landed `credentials` component declaration requires that name
// `serverConfigRoot` -- confirmed against `core-server`'s real, landed `package.json` (not the Phase 2
// task doc draft): a bare `setupArg:serverConfigRoot` (fixed `framework`-phase provide, fixed
// `load`-phase require) and `{ capability: 'appExt:serverConfigRoot', phase: 'runtime' }`. Both are
// provided by the framework's own intrinsic manifest (`FRAMEWORK_MANIFEST`), never by `credentials`
// itself.
const RENAMED_CAPABILITIES = [
  { removed : 'appExt:serverConfigRoot', renamed : 'appExt:serverConfigRootV2' },
  { removed : 'setupArg:serverConfigRoot', renamed : 'setupArg:serverConfigRootV2' }
]

// A snapshot taken before any test runs, used at the end of this file to prove the real, imported
// `FRAMEWORK_MANIFEST` module-level object was never mutated in place by the synthetic-clone tests
// above -- `structuredClone` is structurally incapable of producing a shared reference back into the
// source object, but this is the explicit, provable check the task's Validation section calls for.
const FRAMEWORK_MANIFEST_SNAPSHOT = structuredClone(FRAMEWORK_MANIFEST)

// Deep-clones `FRAMEWORK_MANIFEST` and, in the clone only, renames each of `RENAMED_CAPABILITIES`'
// `removed` provides entries to its `renamed` counterpart, carrying `supersedes: [removed]` -- mirroring
// the exact worked example in `docs/plugin-manifest-schema.md`'s `### supersedes` section
// (`{ capability: appExt:serverConfigRoot, phase: framework, supersedes: [appExt:serverHome] }`, the real
// intrinsic declaration for the historical rename) one rename further along. Each renamed entry keeps
// every other field (`phase`, `exclusive`, etc.) from the entry it replaces -- only `capability` and
// `supersedes` change. `structuredClone` guarantees the real, imported `FRAMEWORK_MANIFEST` is never
// mutated in place; no other test file sharing the same module-level import is affected.
const cloneFrameworkManifestWithRename = () => {
  const clone = structuredClone(FRAMEWORK_MANIFEST)

  clone.provides = clone.provides.flatMap((entry) => {
    const capability = typeof entry === 'string' ? entry : entry.capability
    const renameEntry = RENAMED_CAPABILITIES.find(({ removed }) => removed === capability)

    if (renameEntry === undefined) return [entry]

    const originalEntry = typeof entry === 'string' ? { capability : entry } : { ...entry }

    return [{ ...originalEntry, capability : renameEntry.renamed, supersedes : [renameEntry.removed] }]
  })

  return clone
}

// Reads `core-server`'s real, landed `package.json` and `plugable.host` declaration, confirms
// `credentials` actually requires at least one of `RENAMED_CAPABILITIES`' `removed` capabilities (per
// this task's Assumptions), and returns both the host declaration and the subset of
// `RENAMED_CAPABILITIES` credentials actually requires.
const loadCredentialsRenameTargets = () => {
  const repoRoot = resolveCoreServerPackageRoot(__dirname)
  const packageJSON = readCoreServerPackageJSON(repoRoot)
  const hostDeclaration = readHostDeclaration(packageJSON)

  const credentialsRecord = hostDeclaration.builtins.find((record) => record.nodeId === CREDENTIALS_NODE_ID)
  if (credentialsRecord === undefined) {
    throw new Error(`Expected a '${CREDENTIALS_NODE_ID}' record in core-server's real host declaration; none found.`)
  }

  const requiredCapabilities = new Set(credentialsRecord.requires.map((requireEntry) => requireEntry.capability))
  const renameTargets = RENAMED_CAPABILITIES.filter(({ removed }) => requiredCapabilities.has(removed))

  if (renameTargets.length === 0) {
    // Per this task's Assumptions: halt and report rather than inventing a requirement to test against.
    throw new Error(
      "'credentials' no longer requires 'setupArg:serverConfigRoot' or 'appExt:serverConfigRoot' -- this "
      + 'task doc assumed at least one still applies. Halt and report rather than inventing a requirement '
      + 'to test against.'
    )
  }

  return { hostDeclaration, renameTargets }
}

describe('plugin graph: serverConfigRoot rename regression (the "ynGa" shape)', () => {
  // `loadCredentialsRenameTargets()` re-reads and re-parses `core-server`'s real `package.json`
  // from disk and rebuilds the host declaration -- input that never changes within this file.
  // Resolve it once, shared read-only across the three tests below that need it, rather than
  // re-reading `package.json` from disk on every one of them.
  let hostDeclaration
  let renameTargets

  beforeAll(() => {
    ({ hostDeclaration, renameTargets } = loadCredentialsRenameTargets())
  })

  test("credentials's real requires include at least one of the two serverConfigRoot capabilities this test renames", () => {
    expect(renameTargets.length).toBeGreaterThan(0)
  })

  test('a synthetic future rename of serverConfigRoot is caught as an unsatisfied finding naming the new capability as supersededBy', () => {
    const modifiedFrameworkManifest = cloneFrameworkManifestWithRename()

    const result = validatePluginGraph({
      records           : hostDeclaration.builtins,
      frameworkManifest : modifiedFrameworkManifest
    })

    expect(result.ok).toBe(false)

    for (const { removed, renamed } of renameTargets) {
      const finding = result.findings.find((candidate) =>
        (candidate.kind === 'unsatisfied' || candidate.kind === 'unsatisfied-phase')
        && candidate.requirer?.nodeId === CREDENTIALS_NODE_ID
        && candidate.capability?.full === removed)

      if (finding === undefined) {
        console.log(JSON.stringify(result.findings, null, 2))
      }

      expect(finding).toBeDefined()
      // The load-bearing assertion this task exists to make: proving the rename-affordance mechanism
      // fires (the finding names the new capability), not just that something becomes unsatisfied when a
      // name disappears.
      expect(finding.supersededBy).toBeTruthy()
      expect(finding.supersededBy.capability).toBe(renamed)
    }
  })

  test('negative control: the unmodified FRAMEWORK_MANIFEST still resolves these requirements satisfied', () => {
    const result = validatePluginGraph({ records : hostDeclaration.builtins })

    const regressionFindings = result.findings.filter((finding) =>
      finding.requirer?.nodeId === CREDENTIALS_NODE_ID
      && renameTargets.some(({ removed }) => finding.capability?.full === removed))

    if (regressionFindings.length > 0) {
      console.log(JSON.stringify(regressionFindings, null, 2))
    }

    // Guards against the positive assertion above accidentally passing because the real `credentials`
    // declaration is already broken, rather than because the synthetic rename shape was correctly
    // reproduced.
    expect(regressionFindings).toEqual([])
  })

  test('the real, imported FRAMEWORK_MANIFEST is unchanged after the synthetic-clone tests above ran', () => {
    expect(FRAMEWORK_MANIFEST).toEqual(FRAMEWORK_MANIFEST_SNAPSHOT)
  })
})
