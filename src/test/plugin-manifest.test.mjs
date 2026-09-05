/* global describe expect test */
// Drift guard for @sdlcforge/dev-core's package.json `"plugable"` block (plan/notes/
// manifest-scope-and-tooling.md, plan/notes/capability-census.md). Composes four published
// exports of @liquid-labs/plugable-express -- resolvePluginManifest, validatePluginGraph,
// PHASE_ORDER, FRAMEWORK_MANIFEST -- rather than reimplementing satisfaction logic locally.
// There is no plugin-side equivalent of verifyHostDeclaration(): that helper cross-checks a
// *host's* declared plugable.host.builtins against its real builtinPlugins array, and a plain
// plugin (dev-core) has neither. This suite is the better-targeted, plugin-side alternative.
import * as fs from 'node:fs'
import * as fsPath from 'node:path'

// @liquid-labs/plugable-express is a devDependency (test-only import); it must never be
// imported from any non-test module or promoted to 'dependencies'.
import { FRAMEWORK_MANIFEST, resolvePluginManifest, validatePluginGraph } from '@liquid-labs/plugable-express'

// Under Jest, the working directory is 'test-staging/' (make/55-test.mk 'cd $(TEST_STAGING) &&
// jest'), not the repository root, so process.cwd() cannot be used to find package.json.
// Babel transpiles src/**/*.mjs into test-staging/**/*.js without rewriting import specifiers
// or relocating files, so this compiled test's own __dirname sits at
// '<repo-root>/test-staging/test' -- exactly as many levels below test-staging as this source
// file sits below src. Walking up two levels from there reaches the repository root. Verified
// empirically against this checkout before relying on it.
const repoRoot = fsPath.resolve(__dirname, '..', '..')
const pkg = JSON.parse(fs.readFileSync(fsPath.join(repoRoot, 'package.json'), 'utf8'))

// Computed once at module scope and shared by every describe block below: resolvePluginManifest
// and validatePluginGraph are deterministic pure reads over the same package.json input, and none
// of the assertions across this file depend on state introduced by a preceding test. Recomputing
// per describe block would re-parse/re-normalize the same manifest and re-run the same
// graph-satisfaction resolution three (two) times for an identical result.
//
// validatePluginGraph({ records }) implicitly folds FRAMEWORK_MANIFEST in on its own -- confirmed
// empirically against this export. Passing FRAMEWORK_MANIFEST a second time, concatenated into the
// records array, duplicates the framework node and produces ~18 spurious 'exclusivity-disagreement'
// findings. Do not add FRAMEWORK_MANIFEST to `records`.
const records = resolvePluginManifest({ dir : repoRoot, pkg })
const result = validatePluginGraph({ records })

describe('dev-core plugin manifest (drift guard)', () => {
  describe('assertion 1: the manifest parses', () => {
    test('resolvePluginManifest returns exactly four normalized records, in src/index.mjs order', () => {
      expect(Array.isArray(records)).toBe(true)
      expect(records).toHaveLength(4)
      expect(records.map(({ component }) => component))
        .toEqual(['projects', 'orgs', 'work', 'projects-audit'])
    })
  })

  describe('assertions 2 and 3: satisfaction against the framework and against dev-core itself', () => {
    // A finding is how validatePluginGraph reports an *unsatisfied* requirement; a requirement
    // that resolves cleanly produces no finding at all. So "is this specific requirement
    // satisfied" is asserted as "no finding names this exact (capability, requirer, phase)
    // triple" -- the only vocabulary the graph result exposes for a positive satisfaction claim.
    const isUnsatisfied = ({ capability, nodeId, phase }) => result.findings.some((finding) =>
      finding.capability.full === capability
      && finding.requirer.nodeId === nodeId
      && finding.requirer.phase === phase)

    const PROJECTS = '@sdlcforge/dev-core#projects'
    const ORGS = '@sdlcforge/dev-core#orgs'
    const WORK = '@sdlcforge/dev-core#work'
    const PROJECTS_AUDIT = '@sdlcforge/dev-core#projects-audit'

    test('FRAMEWORK_MANIFEST is folded into validatePluginGraph without being passed explicitly', () => {
      // Sanity check on the premise above: the framework node is present in the result's own
      // node list even though `records` (built solely from dev-core's package.json) never
      // mentions it.
      expect(result.nodes.some(({ nodeId }) => nodeId === FRAMEWORK_MANIFEST.npmName)).toBe(true)
      expect(records.some(({ npmName }) => npmName === FRAMEWORK_MANIFEST.npmName)).toBe(false)
    })

    test.each([
      ['appExt:serverConfigRoot', WORK, 'load'],
      ['appExt:serverConfigRoot', PROJECTS, 'runtime'],
      ['appExt:constants', WORK, 'load'],
      ['appExt:setupMethods', ORGS, 'load'],
      ['appExt:integrations', WORK, 'runtime'],
      ['setupArg:registerPathVar', PROJECTS, 'load'],
      ['setupArg:registerPathVar', ORGS, 'load'],
      ['setupArg:registerPathVar', WORK, 'load']
    ])('framework-facing requirement %s (%s @ %s) resolves satisfied', (capability, nodeId, phase) => {
      expect(isUnsatisfied({ capability, nodeId, phase })).toBe(false)
    })

    test.each([
      ['appExt:_liqProjects.playgroundMonitor', ORGS, 'setup'],
      ['appExt:_liqProjects.playgroundMonitor', WORK, 'runtime'],
      ['appExt:_liqProjects.playgroundMonitor', PROJECTS_AUDIT, 'runtime'],
      ['pathVar:projectName', PROJECTS_AUDIT, 'handlers']
    ])('intra-package requirement %s (%s @ %s) resolves satisfied', (capability, nodeId, phase) => {
      expect(isUnsatisfied({ capability, nodeId, phase })).toBe(false)
    })

    test('same-plugin pathVar:parameterKey (handlers/handlers) is both provided and required by orgs, and resolves satisfied', () => {
      // orgs both provides and requires this capability at the same 'handlers' phase -- the
      // same-plugin case the schema's components: form exists to make statically provable.
      // validatePluginGraph does not model a same-node requirement as a cross-node edge (there
      // is no edge in `result.edges` from '#orgs' to itself for this capability), so the
      // structural half of this assertion is read directly off the resolved orgs record, and the
      // satisfaction half is the same not-in-findings check used above.
      const orgs = records.find(({ component }) => component === 'orgs')
      expect(orgs.provides.some(({ capability, phase }) =>
        capability === 'pathVar:parameterKey' && phase === 'handlers')).toBe(true)
      expect(orgs.requires.some(({ capability, phase }) =>
        capability === 'pathVar:parameterKey' && phase === 'handlers')).toBe(true)

      expect(isUnsatisfied({ capability : 'pathVar:parameterKey', nodeId : ORGS, phase : 'handlers' }))
        .toBe(false)
    })
  })

  describe('the critical scoping rule: do not assert an overall-clean graph', () => {
    // Two requirements -- both appExt:credentialsDB (@sdlcforge/core-server's unmanifested
    // src/credentials/ component, required by both projects and work) -- legitimately report
    // unsatisfied at 'error' severity against a dev-core-plus-framework graph; their provider
    // genuinely does not exist in this graph. Two more requirements are declared
    // 'optional: true' -- integrationHook:controls/getQuestionControls (guarded by hasHook,
    // src/work/handlers/_lib/submit-lib.mjs:94) and appExt:_liqOrgs.orgSetupMethods
    // (unconditionally initialized to an empty array by 'prepare org dependencies' and only
    // ever populated by the external, unmanifested liq-policy package) -- so both report
    // unsatisfied at 'info' severity instead. This is the real, intended cross-package gap
    // this plan wants left visible (plan/notes/manifest-scope-and-tooling.md), so it is
    // asserted explicitly here rather than treated as a graph failure -- a future reader must
    // not "fix" this suite by tightening it into an overall-clean assertion.
    // (`records`/`result` reused from module scope above -- see the comment there.)

    test('the graph is not overall-clean (the out-of-package gap is real and expected)', () => {
      expect(result.ok).toBe(false)
    })

    test('the unsatisfied set is exactly the three expected out-of-package capabilities, nothing else', () => {
      const findingsShape = result.findings
        .map(({ capability, requirer, severity }) =>
          `${capability.full} <- ${requirer.nodeId}@${requirer.phase} (${severity})`)
        .sort()

      expect(findingsShape).toEqual([
        'appExt:_liqOrgs.orgSetupMethods <- @sdlcforge/dev-core#orgs@setup (info)',
        'appExt:credentialsDB <- @sdlcforge/dev-core#projects@load (error)',
        'appExt:credentialsDB <- @sdlcforge/dev-core#work@runtime (error)',
        'integrationHook:controls/getQuestionControls <- @sdlcforge/dev-core#work@runtime (info)'
      ])
      expect(result.counts).toEqual({ error : 2, warning : 0, info : 2 })
    })
  })
})
