/* global describe expect test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import { verifyHostDeclaration } from '@liquid-labs/plugable-express'

import { explicitPlugins } from '../app-init'
import { builtinPluginsFor, componentNames, submodules } from '../builtin-plugins'

// Wires the framework's `verifyHostDeclaration()` into this repo's own Jest suite so a future
// edit to the real `explicitPlugins`/`submodules` arrays that forgets the matching
// `package.json` `plugable.host` block update fails `make test` rather than silently narrowing
// the validated set. See 'plan/phase-01-framework-uptake-and-host-declaration/
// 003-add-host-declaration-drift-guard.md'.
describe('plugable.host declaration', () => {
  test('agrees with the real builtinPlugins/explicitPlugins arrays', async() => {
    const bits = await fs.readFile(fsPath.join(__dirname, '..', '..', '..', 'package.json'))
    const packageJSON = JSON.parse(bits)

    const builtinPlugins = builtinPluginsFor({ npmName : packageJSON.name, version : packageJSON.version })

    const result = verifyHostDeclaration({ builtinPlugins, explicitPlugins, hostPackageJSON : packageJSON })

    if (result.ok !== true || result.findings.length > 0) {
      console.log(JSON.stringify(result.findings, null, 2))
    }

    expect(result.ok).toBe(true)
    expect(result.findings).toEqual([])
  })

  // `verifyHostDeclaration()` above does NOT guard the component order, despite an earlier
  // version of `builtin-plugins.mjs`'s header comment claiming it did. Its order check compares
  // the `npmName` SEQUENCE across `builtinPlugins` ENTRIES -- this host has exactly one entry, so
  // that comparison is trivially one-versus-one and can never fail here -- and its component
  // check is a SET comparison (`setsAgree`) against an entry's own inline `manifest` key, which
  // `builtinPluginsFor` never supplies, so it is skipped entirely. The three tests below are the
  // actual enforcement mechanism `builtin-plugins.mjs` names. Each is kept in its own `test()` so
  // a perturbation that also breaks a different, unrelated test (e.g. truncating `componentNames`
  // trivially also disagrees with `package.json`'s longer declared list) still reports the exact
  // assertion this comment names as failing, rather than being masked by an earlier `expect` in
  // the same test throwing first.
  test('element-for-element agreement: runtime componentNames equals the declared component order', async() => {
    const bits = await fs.readFile(fsPath.join(__dirname, '..', '..', '..', 'package.json'))
    const packageJSON = JSON.parse(bits)

    const declaredComponentNames = packageJSON.plugable.host.builtins[0].components.map(
      ({ component }) => component
    )

    // `toEqual` on arrays is ordered -- a set comparison is precisely the weakness being fixed,
    // per `verifyHostDeclaration()`'s gap documented above.
    expect(componentNames).toEqual(declaredComponentNames)
  })

  test('the literal DAG order: credentials, projects, orgs, controls, issues-github, work, projects-audit', () => {
    // Not redundant with the preceding test. A brute-force sweep over all 7! = 5040 orderings
    // (plan/notes/merged-manifest-graph-projection.md) found only two pairwise precedence
    // constraints the compile-time graph validator can see -- `credentials < projects` and
    // `orgs < controls` -- leaving the other five positions free as far as `validatePluginSet()`
    // is concerned. `projects` before `orgs` is load-bearing at RUNTIME only (`orgs`' deferred
    // `load orgs` setup method reads `app.ext._liqProjects.playgroundMonitor`, which `projects`'
    // setup installs eagerly), yet the validator scores that edge as cross-phase with no order
    // verdict at all. A coordinated-but-wrong reorder of both `submodules`/`componentNames` AND
    // `package.json`'s declared array -- e.g. swapping `projects` and `orgs` in all three,
    // consistently -- would satisfy the preceding test's agreement check and pass the graph gate,
    // since neither array's internal order nor the graph gate would notice. Only this literal
    // ordering check catches that case.
    expect(componentNames).toEqual([
      'credentials',
      'projects',
      'orgs',
      'controls',
      'issues-github',
      'work',
      'projects-audit'
    ])
  })

  test('non-vacuity and index alignment: componentNames has 7 unique entries, one per wired submodule', () => {
    // The namespace imports in `builtin-plugins.mjs` carry no name of their own to introspect,
    // which is why `componentNames` is hand-maintained rather than derived -- and exactly why it
    // needs this guard. An empty or truncated export on either side must not be able to pass
    // silently.
    expect(componentNames).toHaveLength(7)
    expect(new Set(componentNames).size).toBe(componentNames.length)
    expect(componentNames.length).toBe(submodules.length)
  })
})
