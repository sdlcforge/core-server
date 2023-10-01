import { existsSync, readFileSync } from 'node:fs'
import * as fsPath from 'node:path'

import { CATALYST_API_SPEC, CATALYST_SERVER_PLUGINS, CATALYST_HOME } from '@liquid-labs/catalyst-defaults'
import { LIQ_PLAYGROUND } from '@liquid-labs/liq-defaults'
import { appInit as superInit } from '@liquid-labs/plugable-express'

const packageJSONPathProd = fsPath.resolve(__dirname, '..', 'package.json')
const packageJSONPathTest = fsPath.resolve(__dirname, '..', '..', 'package.json')
const packageJSONPath = existsSync(packageJSONPathProd) ? packageJSONPathProd : packageJSONPathTest
const myPackagePath = fsPath.dirname(packageJSONPath)

const pkgJSON = JSON.parse(readFileSync(packageJSONPath, { encoding : 'utf8' }))
const { version: pkgVersion } = pkgJSON

const appInit = async({
  name = 'catalyst-server',
  cliName = 'catalyst',
  version = pkgVersion,

  apiSpecPath = CATALYST_API_SPEC(),
  pluginsPath = CATALYST_SERVER_PLUGINS(),
  pluginPaths = [myPackagePath],
  defaultRegistries = [
    {
      name : 'Liquid Labs Canonical Catalyst Registry',
      url  : 'raw.githubusercontent.com/liquid-labs/catalyst-registry/main/registry.yaml'
    }
  ],
  devPaths = [LIQ_PLAYGROUND()],
  serverHome = CATALYST_HOME(),
  useDefaultSettings = true,
  ...options
}) => {
  const results =
    await superInit({
      apiSpecPath,
      cliName,
      devPaths,
      name,
      pluginsPath,
      pluginPaths,
      defaultRegistries,
      serverHome,
      useDefaultSettings,
      version,
      ...options
    })

  return results
}

export { appInit }
