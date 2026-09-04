/* global describe expect test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import { verifyHostDeclaration } from '@liquid-labs/plugable-express'

import { explicitPlugins } from '../app-init'
import { builtinPluginsFor } from '../builtin-plugins'

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
})
