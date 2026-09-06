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
// Scope decision (manager, 2026-09-03; revised phase-01 task-002, 2026-09-06; revised
// phase-04 task-003, 2026-09-06): the real, post-merge graph is clean of error-severity
// findings. The merge that absorbed `@sdlcforge/dev-core`'s four components into
// `@sdlcforge/core-server`'s own builtin manifest -- reordered per Phase 3's DAG-order fix --
// resolves both findings this gate previously had to allowlist:
//
// - `violated-by-source-order` / `appExt:_liqOrgs.orgs` / `@sdlcforge/core-server#controls` --
//   resolved by Phase 3's reordering. The edge now flips to `orderVerdict:
//   'satisfied-by-source-order'`.
// - `unsatisfied` / `appExt:_liqOrgs.orgSetupMethods` / `@sdlcforge/dev-core#orgs` -- cleared
//   by Phase 1's drift clearance: the merged manifest now carries `@sdlcforge/dev-core`'s own
//   *source* declaration (which has `"optional": true` on this requirement) rather than the
//   stale `.yalc` copy's, so the finding downgrades from `error` to `info` severity and no
//   longer needs an allowlist entry. It also renames, with the rest of the absorbed component,
//   to `@sdlcforge/core-server#orgs`.
//
// The one remaining, expected gap is this downgraded `info` finding, not an unqualified "the
// graph is clean": `appExt:_liqOrgs.orgSetupMethods` is written only by `liq-policy`, which is
// not installed in this graph, and `orgs`' own setup (src/orgs/setup.mjs) unconditionally
// initializes the array empty regardless, so the requirement is genuinely optional and its
// absence is not a defect. This gate therefore asserts the full predicted finding set below --
// exactly 1 `info` and 4 `debug` `unmanifested-node` findings (one per undiscoverable
// `@liquid-labs/sdlc-projects-*` explicit plugin) -- rather than merely "no errors", so a future
// change that alters this exact shape forces a fresh look instead of silently continuing to pass.
describe('plugin graph build gate (make test / make qa)', () => {
  // A single, shared `validatePluginSet()` call: the four tests below only read different slices
  // of one invariant result over the real, unmodified graph -- none mutates it, so one resolution
  // serves all four assertions rather than repeating the real filesystem/graph work four times.
  let result

  beforeAll(async() => {
    const packageRoot = resolveCoreServerPackageRoot(__dirname)
    result = await validatePluginSet({ packageRoot })
  })

  test("core-server's real, full plugin graph resolves clean, with exactly the one predicted, genuinely-optional info finding", () => {
    const errorFindings = result.engineResult.findings.filter((finding) => finding.severity === 'error')

    if (errorFindings.length > 0) {
      // Surface the full findings on failure -- this is the whole point of the gate.
      console.log(JSON.stringify(errorFindings, null, 2))
    }

    expect(result.outcome).toBe('ok')
    expect(result.exitCode).toBe(0)

    // Individual key reads, not a deep-equal of the whole `counts` object -- its exact key set
    // is not asserted here, only the three counts this gate cares about.
    expect(result.engineResult.counts.error).toBe(0)
    expect(result.engineResult.counts.warning).toBe(0)
    expect(result.engineResult.counts.info).toBe(1)

    // `debug` findings are present in `findings` but are not tallied in `counts` -- a
    // `counts.info` of 1 alongside a `findings.length` of 5 is correct, not a contradiction.
    expect(result.engineResult.findings.length).toBe(5)

    const infoFindings = result.engineResult.findings.filter((finding) => finding.severity === 'info')
    expect(infoFindings.length).toBe(1)
    expect(infoFindings[0].kind).toBe('unsatisfied')
    expect(infoFindings[0].capability?.full).toBe('appExt:_liqOrgs.orgSetupMethods')
    expect(infoFindings[0].requirer?.nodeId).toBe('@sdlcforge/core-server#orgs')
    expect(infoFindings[0].requirer?.phase).toBe('setup')
    expect(infoFindings[0].requirer?.optional).toBe(true)

    const debugFindings = result.engineResult.findings.filter((finding) => finding.severity === 'debug')
    expect(debugFindings.length).toBe(4)
    expect(debugFindings.every((finding) => finding.kind === 'unmanifested-node')).toBe(true)
    expect(debugFindings.map((finding) => finding.nodeId).sort()).toEqual([
      '@liquid-labs/sdlc-projects-badges-coverage',
      '@liquid-labs/sdlc-projects-badges-github-workflows',
      '@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd',
      '@liquid-labs/sdlc-projects-workflow-local-node-build'
    ])
  })

  test('the two edges this plan-group chartered resolve satisfied', () => {
    // '@sdlcforge/core-server#projects' (absorbed from dev-core by the merge) requires
    // 'appExt:credentialsDB @ load' from '@sdlcforge/core-server#credentials' -- both now
    // intra-builtin nodes. Phase 3 verified this resolves 'satisfied-by-source-order' (a literal
    // string verdict, since provider and requirer share the same phase).
    const credentialsDBEdge = result.engineResult.edges.find((edge) =>
      edge.capability === 'appExt:credentialsDB' && edge.to === '@sdlcforge/core-server#projects')

    expect(credentialsDBEdge).toBeDefined()
    expect(credentialsDBEdge.from).toBe('@sdlcforge/core-server#credentials')
    expect(credentialsDBEdge.orderVerdict).toBe('satisfied-by-source-order')

    // '@sdlcforge/core-server#work' (absorbed from dev-core by the merge) requires
    // 'appExt:serverConfigRoot @ load' from the framework's own intrinsic manifest. Provider
    // phase ('framework') unconditionally precedes every plugin phase, so `samePhase` is false
    // and `orderVerdict` is `null` by schema design -- no order-check literal applies. Do NOT
    // flatten this into asserting a literal `'satisfied'` string; per Phase 3's own verified
    // verdict shape, satisfaction here is confirmed by the edge existing at all plus the absence
    // of any failure finding naming this capability/node.
    const serverConfigRootEdge = result.engineResult.edges.find((edge) =>
      edge.capability === 'appExt:serverConfigRoot' && edge.to === '@sdlcforge/core-server#work')

    expect(serverConfigRootEdge).toBeDefined()
    expect(serverConfigRootEdge.providerPhase).toBe('framework')
    expect(serverConfigRootEdge.samePhase).toBe(false)
    expect(serverConfigRootEdge.orderVerdict).toBe(null)

    const serverConfigRootFailureFindings = result.engineResult.findings.filter((finding) =>
      finding.capability?.full === 'appExt:serverConfigRoot' || finding.requirer?.nodeId === '@sdlcforge/core-server#work')

    expect(serverConfigRootFailureFindings).toEqual([])
  })

  test('the coverage boundary is stated: core/builtin sources searched, dynamic sources explicitly out of scope', () => {
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

  test('the resolved graph is non-trivial, not a vacuously empty result', () => {
    const nodeIds = result.engineResult.nodes.map((node) => node.nodeId)

    expect(nodeIds.length).toBeGreaterThan(1)
    // The builtin block is now the whole absorbed set -- name all seven components to prove the
    // merged aggregate resolved, not merely that some nodes did.
    expect(nodeIds).toEqual(expect.arrayContaining([
      '@sdlcforge/core-server#credentials',
      '@sdlcforge/core-server#projects',
      '@sdlcforge/core-server#orgs',
      '@sdlcforge/core-server#controls',
      '@sdlcforge/core-server#issues-github',
      '@sdlcforge/core-server#work',
      '@sdlcforge/core-server#projects-audit'
    ]))
  })
})
