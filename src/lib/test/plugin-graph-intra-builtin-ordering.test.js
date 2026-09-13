/* global beforeAll describe expect test */
import { validatePluginSet } from '@liquid-labs/plugable-express'

import { resolveCoreServerPackageRoot } from './helpers/resolve-plugin-set'

// Permanent regression coverage for "the ordering shape" described in
// 'plan/phases/validation-gate-and-regression.md' (Goals, third bullet, 2026-09-01 update).
// Phase 3's one-off verification
// ('plan/phase-03-third-party-coupling-coverage/001-verify-third-party-requiring-edges-satisfied.md')
// originally confirmed these two couplings against `@sdlcforge/dev-core` as a separate,
// third-party package. `@sdlcforge/dev-core` has since been merged in-tree into
// `@sdlcforge/core-server`'s own builtin manifest (see
// 'plan/notes/merged-manifest-graph-projection.md'), so both edges below are now intra-builtin
// (`appExt:credentialsDB`) or framework-to-builtin (`appExt:serverConfigRoot`) rather than
// cross-package. This file keeps the regression coverage over the real graph -- not a synthetic
// one -- via the same full, real `validatePluginSet()` composition task 001's gate test
// (`plugin-graph-gate.test.js`) uses. It asserts the full edge (both provider and requirer) for
// both couplings, per this phase document's 2026-09-01 update.
//
// `packageRoot` MUST be resolved via the shared helper, not `process.cwd()` (the
// `validatePluginSet()` default): Jest runs from Babel-transpiled output under `test-staging/`
// (make/55-test.mk), not from `src/`, so `process.cwd()` at test time is `test-staging/`, not the
// real package root. Passing the wrong root yields a `resolution-failure` (exit code `2`) that
// looks like a framework bug and is not -- see 'plan/notes/build-wiring-and-dependency-refresh.md'.
describe('plugin graph ordering regression (appExt:credentialsDB / appExt:serverConfigRoot, now intra-builtin)', () => {
  // A single, shared `validatePluginSet()` call: all three tests below only read different slices
  // of one invariant result over the real, unmodified graph -- none mutates it, so one resolution
  // serves all three assertions rather than repeating the real filesystem/graph work three times.
  let result

  beforeAll(async() => {
    const packageRoot = resolveCoreServerPackageRoot(__dirname)
    result = await validatePluginSet({ packageRoot })
  })

  test("core-server#projects' appExt:credentialsDB @ load requirement resolves satisfied-by-source-order", () => {
    // Confirmed against the real result (not assumed): the provider-side node is the builtin
    // `@sdlcforge/core-server#credentials` component ('from'); the consumer/requirer-side node
    // is `@sdlcforge/core-server#projects` ('to'). Both sit at the 'load' phase, so this is a
    // same-phase edge and earns a literal order verdict -- now provable because both nodes sit
    // in the same builtin block at comparable `loadIndex` positions, rather than across a
    // builtin/explicit-plugin boundary as before the `@sdlcforge/dev-core` merge.
    const edge = result.engineResult.edges.find((e) =>
      e.capability === 'appExt:credentialsDB'
      && e.from === '@sdlcforge/core-server#credentials'
      && e.to === '@sdlcforge/core-server#projects')

    expect(edge).toBeDefined()
    expect(edge.samePhase).toBe(true)
    expect(edge.providerPhase).toBe('load')
    expect(edge.requirerPhase).toBe('load')
    // The specific, provable verdict this edge is supposed to earn -- provable only because
    // `builtinPlugins` is loading source #1 by construction -- not merely "no error". Literal
    // verdict recorded here per this task's own Validation requirement.
    expect(edge.orderVerdict).toBe('satisfied-by-source-order')
  })

  test("core-server#work's appExt:serverConfigRoot @ load requirement resolves satisfied against the framework's own intrinsic manifest", () => {
    // Confirmed against the real result (not assumed): the provider-side node is the
    // framework's own intrinsic manifest ('@liquid-labs/plugable-express', 'from'); the
    // consumer/requirer-side node is `@sdlcforge/core-server#work` ('to'). The provider's phase is
    // 'framework', which unconditionally precedes every plugin phase in the lattice (including
    // 'load', the requirer's phase) -- so this is a cross-phase edge: `samePhase` is `false` and
    // `orderVerdict` is `null` by schema design, since the load-order model only produces a
    // verdict for a same-phase edge. Do NOT flatten this into asserting a literal `'satisfied'`
    // string -- there is none to assert for a cross-phase edge; satisfaction is confirmed by the
    // edge existing at all (this test) plus the absence of any failure finding naming it (the
    // next test).
    const edge = result.engineResult.edges.find((e) =>
      e.capability === 'appExt:serverConfigRoot'
      && e.from === '@liquid-labs/plugable-express'
      && e.to === '@sdlcforge/core-server#work')

    expect(edge).toBeDefined()
    expect(edge.samePhase).toBe(false)
    expect(edge.providerPhase).toBe('framework')
    expect(edge.requirerPhase).toBe('load')
    expect(edge.orderVerdict).toBe(null)
  })

  test('neither target edge is named by an unsatisfied/unsatisfied-phase/order-unprovable/violated-by-source-order finding', () => {
    // Second, independent check using the vocabulary Phase 3's own verification task already
    // used ('isUnsatisfied'-style) -- confirm no finding of any of these kinds names either of
    // this plan-group's two chartered {capability, nodeId, phase} triples at the 'load' phase.
    const FAILURE_KINDS = ['unsatisfied', 'unsatisfied-phase', 'order-unprovable', 'violated-by-source-order']
    const TARGET_TRIPLES = [
      { capability : 'appExt:credentialsDB', nodeId : '@sdlcforge/core-server#projects', phase : 'load' },
      { capability : 'appExt:serverConfigRoot', nodeId : '@sdlcforge/core-server#work', phase : 'load' }
    ]

    const matchingFailures = result.engineResult.findings.filter((finding) =>
      FAILURE_KINDS.includes(finding.kind)
      && TARGET_TRIPLES.some((triple) =>
        finding.capability?.full === triple.capability
        && finding.requirer?.nodeId === triple.nodeId
        && finding.requirer?.phase === triple.phase))

    // Confirmed against the real result: the merged run has zero error-severity findings, so
    // `matchingFailures` is trivially empty here -- the check remains meaningful as insurance
    // against a future regression that produces a failure finding naming either target triple.
    expect(matchingFailures).toEqual([])
  })
})
