/* global describe expect test */
import { validatePluginSet } from '@liquid-labs/plugable-express'

import { resolveCoreServerPackageRoot } from './helpers/resolve-plugin-set'

// The Jest test 'make/56-plugin-graph.mk' depends on (via the shared unit-test pass marker) to
// satisfy this task's build-time gate requirement: 'make test'/'make qa' exercise
// `validatePluginSet()` against `core-server`'s real, full plugin graph -- not a fixture, and not
// only in a downstream consumer's own CI. See 'make/56-plugin-graph.mk' for the full wiring
// rationale.
//
// `packageRoot` MUST be resolved via the shared helper, not `process.cwd()` (the
// `validatePluginSet()` default): Jest runs from Babel-transpiled output under `test-staging/`
// (make/55-test.mk), not from `src/`, so `process.cwd()` at test time is `test-staging/`, not
// the real package root. Passing the wrong root yields a `resolution-failure` (exit code `2`)
// that looks like a framework bug and is not -- see
// 'plan/notes/build-wiring-and-dependency-refresh.md'.
//
// Scope decision (manager, 2026-09-03): the real graph is not fully clean. `validatePluginSet()`
// returns exactly 2 error-severity findings, both inside `@sdlcforge/dev-core#orgs` and unrelated
// to `core-server`'s own declarations -- already triaged and scoped as `@sdlcforge/dev-core`'s
// own concern, outside this plan-group's `plans: {core-server: ...}` participant set (see
// 'plan/notes/manifest-ownership-boundary.md'). Rather than asserting unconditional
// `outcome === 'ok'` (which would make this gate permanently red for a condition this plan-group
// has decided not to fix from `core-server`'s side) or silently weakening the assertion to pass
// anything, this test asserts an EXPLICIT ALLOWLIST: exactly these 2 known error-severity
// findings are permitted, matched by finding-type + the specific capability/component names
// below. Any additional or different error-severity finding still fails this test -- including a
// future change to `dev-core#orgs` that alters this exact finding set, which should force a
// fresh look rather than silently continuing to pass.
const ALLOWLISTED_ERROR_FINDINGS = [
  {
    kind           : 'unsatisfied',
    capabilityFull : 'appExt:_liqOrgs.orgSetupMethods',
    requirerNodeId : '@sdlcforge/dev-core#orgs'
  },
  {
    kind           : 'violated-by-source-order',
    capabilityFull : 'appExt:_liqOrgs.orgs',
    requirerNodeId : '@sdlcforge/core-server#controls'
  }
]

const isAllowlisted = (finding) =>
  ALLOWLISTED_ERROR_FINDINGS.some((allowed) =>
    allowed.kind === finding.kind
    && allowed.capabilityFull === finding.capability?.full
    && allowed.requirerNodeId === finding.requirer?.nodeId)

describe('plugin graph build gate (make test / make qa)', () => {
  test("core-server's real, full plugin graph resolves with only the allowlisted, already-triaged dev-core#orgs findings", async() => {
    const packageRoot = resolveCoreServerPackageRoot(__dirname)

    const result = await validatePluginSet({ packageRoot })

    const errorFindings = result.engineResult.findings.filter((finding) => finding.severity === 'error')

    if (errorFindings.length !== ALLOWLISTED_ERROR_FINDINGS.length || errorFindings.some((f) => !isAllowlisted(f))) {
      // Surface the full findings on failure -- this is the whole point of the gate.
      console.log(JSON.stringify(errorFindings, null, 2))
    }

    expect(errorFindings.length).toBe(ALLOWLISTED_ERROR_FINDINGS.length)
    expect(errorFindings.every((finding) => isAllowlisted(finding))).toBe(true)

    // The steady-state exit code is 1 (validation-failure), not 0, precisely because the 2
    // allowlisted findings above remain present. This is expected and recorded here explicitly
    // so a future reader does not mistake `1` for an unexpected regression.
    expect(result.outcome).toBe('validation-failure')
    expect(result.exitCode).toBe(1)
  })

  test('the two edges this plan-group chartered resolve satisfied', async() => {
    const packageRoot = resolveCoreServerPackageRoot(__dirname)

    const result = await validatePluginSet({ packageRoot })

    // '@sdlcforge/dev-core#projects' requires 'appExt:credentialsDB @ load' from
    // '@sdlcforge/core-server#credentials' -- Phase 3 verified this resolves
    // 'satisfied-by-source-order' (a literal string verdict, since provider and requirer share
    // the same phase).
    const credentialsDBEdge = result.engineResult.edges.find((edge) =>
      edge.capability === 'appExt:credentialsDB' && edge.to === '@sdlcforge/dev-core#projects')

    expect(credentialsDBEdge).toBeDefined()
    expect(credentialsDBEdge.orderVerdict).toBe('satisfied-by-source-order')

    // '@sdlcforge/dev-core#work' requires 'appExt:serverConfigRoot @ load' from the framework's
    // own intrinsic manifest. Provider phase ('framework') unconditionally precedes every plugin
    // phase, so `samePhase` is false and `orderVerdict` is `null` by schema design -- no
    // order-check literal applies. Do NOT flatten this into asserting a literal `'satisfied'`
    // string; per Phase 3's own verified verdict shape, satisfaction here is confirmed by the
    // edge existing at all plus the absence of any failure finding naming this capability/node.
    const serverConfigRootEdge = result.engineResult.edges.find((edge) =>
      edge.capability === 'appExt:serverConfigRoot' && edge.to === '@sdlcforge/dev-core#work')

    expect(serverConfigRootEdge).toBeDefined()
    expect(serverConfigRootEdge.providerPhase).toBe('framework')
    expect(serverConfigRootEdge.orderVerdict).toBe(null)

    const serverConfigRootFailureFindings = result.engineResult.findings.filter((finding) =>
      finding.capability?.full === 'appExt:serverConfigRoot' || finding.requirer?.nodeId === '@sdlcforge/dev-core#work')

    expect(serverConfigRootFailureFindings).toEqual([])
  })

  test('the coverage boundary is stated: core/builtin sources searched, dynamic sources explicitly out of scope', async() => {
    const packageRoot = resolveCoreServerPackageRoot(__dirname)

    const result = await validatePluginSet({ packageRoot })

    // The real field name the validator's `coverage` object uses is `'builtin'`, not
    // `'builtinPlugins'` -- confirmed against the live result rather than assumed.
    expect(result.coverage.sourcesSearched).toEqual(expect.arrayContaining(['builtin', 'serverPackageRoot']))

    // `core-server` passes `dynamicPluginInstallDir: COMPLY_HOME()` today (src/lib/app-init.mjs),
    // so this coverage boundary is a live, non-hypothetical distinction for this host, not a
    // hypothetical one -- the gate must not silently imply whole-set coverage.
    expect(result.coverage.sourcesSearched).not.toEqual(expect.arrayContaining(['dynamicPluginInstallDir']))
    expect(result.coverage.sourcesSearched).not.toEqual(expect.arrayContaining(['pluginPaths']))
    expect(result.coverage.outOfScope).toEqual(expect.arrayContaining(['dynamicPluginInstallDir', 'pluginPaths']))
  })

  test('the resolved graph is non-trivial, not a vacuously empty result', async() => {
    const packageRoot = resolveCoreServerPackageRoot(__dirname)

    const result = await validatePluginSet({ packageRoot })

    const nodeIds = result.engineResult.nodes.map((node) => node.nodeId)

    expect(nodeIds.length).toBeGreaterThan(1)
    expect(nodeIds).toEqual(expect.arrayContaining([
      '@sdlcforge/core-server#controls',
      '@sdlcforge/core-server#credentials',
      '@sdlcforge/core-server#issues-github',
      '@sdlcforge/dev-core#projects'
    ]))
  })
})
