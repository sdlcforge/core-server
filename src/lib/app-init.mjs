import { existsSync, readFileSync } from 'node:fs'
import * as fsPath from 'node:path'

import { CATALYST_API_SPEC, CATALYST_SERVER_PLUGINS, CATALYST_HOME } from '@liquid-labs/catalyst-defaults'
import { appInit as superInit } from '@liquid-labs/plugable-express'

const packageJSONPathProd = fsPath.resolve(__dirname, '..', 'package.json')
const packageJSONPathTest = fsPath.resolve(__dirname, '..', '..', 'package.json')
const packageJSONPath = existsSync(packageJSONPathProd) ? packageJSONPathProd : packageJSONPathTest
const myPackagePath = fsPath.dirname(packageJSONPath)

const pkgJSON = JSON.parse(readFileSync(packageJSONPath, { encoding : 'utf8' }))
const { version: pkgVersion } = pkgJSON

const appInit = async({
  name = 'comply-server',
  version = pkgVersion,
  apiSpecPath = CATALYST_API_SPEC(),
  pluginsPath = CATALYST_SERVER_PLUGINS(),
  pluginPaths = [myPackagePath],
  defaultRegistries = [
    {
      name : 'Liquid Labs Canonical Catalyst Registry',
      url  : 'https://raw.githubusercontent.com/liquid-labs/liq-registry/main/registry.yaml'
    }
  ],
  serverHome = CATALYST_HOME(),
  useDefaultSettings = true,
  ...options
}) => {
  const results =
    await superInit({
      name,
      version,
      apiSpecPath,
      pluginsPath,
      pluginPaths,
      defaultRegistries,
      serverHome,
      useDefaultSettings,
      ...options
    })

  return results
}

export { appInit }
