import { existsSync, readFileSync } from 'node:fs'
import * as fsPath from 'node:path'

import { CATALYST_API_SPEC, CATALYST_SERVER_PLUGINS, CATALYST_HOME } from '@liquid-labs/catalyst-defaults'
import { appInit as superInit } from '@liquid-labs/plugable-express'

const packagePathProd = fsPath.resolve(__dirname, '..', 'package.json')
const packagePathTest = fsPath.resolve(__dirname, '..', '..', 'package.json')
const packagePath = existsSync(packagePathProd) ? packagePathProd : packagePathTest

const pkgJSON = JSON.parse(readFileSync(packagePath, { encoding : 'utf8' }))
const { version: pkgVersion } = pkgJSON

const appInit = async({
  name = 'catalyst-server',
  cliName = 'catalyst',
  version = pkgVersion,
  apiSpecPath = CATALYST_API_SPEC(),
  pluginsPath = CATALYST_SERVER_PLUGINS(),
  defaultRegistries = [
    {
      name : 'Liquid Labs Canonical Catalyst Registry',
      url  : 'raw.githubusercontent.com/liquid-labs/catalyst-registry/main/registry.yaml'
    }
  ],
  serverHome = CATALYST_HOME(),
  useDefaultSettings = true,
  ...options
}) => {
  const results =
    await superInit({
      name,
      cliName,
      version,
      apiSpecPath,
      pluginsPath,
      defaultRegistries,
      serverHome,
      useDefaultSettings,
      ...options
    })

  return results
}

export { appInit }
