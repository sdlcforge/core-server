/* global describe expect test */
import { validatePluginSet } from '@liquid-labs/plugable-express'

import { resolveCoreServerPackageRoot } from './helpers/resolve-plugin-set'

// Permanent regression coverage for "the ordering shape" described in
// 'plan/phases/validation-gate-and-regression.md' (Goals, third bullet, 2026-09-01 update).
// Phase 3's one-off verification
// ('plan/phase-03-third-party-coupling-coverage/001-verify-third-party-requiring-edges-satisfied.md')
// confirmed, against the real, unmodified plugin graph, that `@sdlcforge/dev-core`'s own shipped
// manifest closes both of this plan-group's headline bugs. This file turns that one-off
// confirmation into permanent regression coverage over the real graph -- not a synthetic one --
// via the same full, real `validatePluginSet()` composition task 001's gate test
// (`plugin-graph-gate.test.js`) uses. It asserts the full edge (both provider and requirer) for
// both couplings, per this phase document's 2026-09-01 update.
//
// `packageRoot` MUST be resolved via the shared helper, not `process.cwd()` (the
// `validatePluginSet()` default): Jest runs from Babel-transpiled output under `test-staging/`
// (make/55-test.mk), not from `src/`, so `process.cwd()` at test time is `test-staging/`, not the
// real package root. Passing the wrong root yields a `resolution-failure` (exit code `2`) that
// looks like a framework bug and is not -- see 'plan/notes/build-wiring-and-dependency-refresh.md'.
describe('plugin graph third-party ordering regression (appExt:credentialsDB / appExt:serverConfigRoot)', () => {
  // A single, shared `validatePluginSet()` call: all three tests below only read different slices
  // of one invariant result over the real, unmodified graph -- none mutates it, so one resolution
  // serves all three assertions rather than repeating the real filesystem/graph work three times.
  let result

  beforeAll(async() => {
    const packageRoot = resolveCoreServerPackageRoot(__dirname)
    result = await validatePluginSet({ packageRoot })
  })

  test("dev-core#projects' appExt:credentialsDB @ load requirement resolves satisfied-by-source-order", () => {
    // Confirmed against the real result (not assumed): the provider-side node is the builtin
    // `@sdlcforge/core-server#credentials` component ('from'); the consumer/requirer-side node
    // is `@sdlcforge/dev-core#projects` ('to'). Both sit at the 'load' phase, so this is a
    // same-phase edge and earns a literal order verdict.
    const edge = result.engineResult.edges.find((e) =>
      e.capability === 'appExt:credentialsDB'
      && e.from === '@sdlcforge/core-server#credentials'
      && e.to === '@sdlcforge/dev-core#projects')

    expect(edge).toBeDefined()
    expect(edge.samePhase).toBe(true)
    expect(edge.providerPhase).toBe('load')
    expect(edge.requirerPhase).toBe('load')
    // The specific, provable verdict this edge is supposed to earn -- provable only because
    // `builtinPlugins` is loading source #1 by construction -- not merely "no error". Literal
    // verdict recorded here per this task's own Validation requirement.
    expect(edge.orderVerdict).toBe('satisfied-by-source-order')
  })

  test("dev-core#work's appExt:serverConfigRoot @ load requirement resolves satisfied against the framework's own intrinsic manifest", () => {
    // Confirmed against the real result (not assumed): the provider-side node is the
    // framework's own intrinsic manifest ('@liquid-labs/plugable-express', 'from'); the
    // consumer/requirer-side node is `@sdlcforge/dev-core#work` ('to'). The provider's phase is
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
      && e.to === '@sdlcforge/dev-core#work')

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
      { capability : 'appExt:credentialsDB', nodeId : '@sdlcforge/dev-core#projects', phase : 'load' },
      { capability : 'appExt:serverConfigRoot', nodeId : '@sdlcforge/dev-core#work', phase : 'load' }
    ]

    const matchingFailures = result.engineResult.findings.filter((finding) =>
      FAILURE_KINDS.includes(finding.kind)
      && TARGET_TRIPLES.some((triple) =>
        finding.capability?.full === triple.capability
        && finding.requirer?.nodeId === triple.nodeId
        && finding.requirer?.phase === triple.phase))

    // Confirmed against the real result: the run's only 2 error-severity findings are both
    // inside `@sdlcforge/dev-core#orgs` (an already-triaged, out-of-plan-group concern -- see
    // `plugin-graph-gate.test.js`) and name neither of this task's two target triples.
    expect(matchingFailures).toEqual([])
  })
})
