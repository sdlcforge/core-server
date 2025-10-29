import { existsSync, readFileSync } from 'node:fs'
import * as fsPath from 'node:path'

import {
  COMPLY_API_SPEC_PATH,
  COMPLY_SERVER_CLI_NAME,
  COMPLY_SERVER_PLUGIN_DIR,
  COMPLY_HOME
} from '@liquid-labs/comply-defaults'
import { appInit as superInit } from '@liquid-labs/plugable-express'

const packageJSONPathProd = fsPath.resolve(__dirname, '..', 'package.json')
const packageJSONPathTest = fsPath.resolve(__dirname, '..', '..', 'package.json')
const packageJSONPath = existsSync(packageJSONPathProd) ? packageJSONPathProd : packageJSONPathTest
// This is the core-server package directory containing our node_modules with explicit plugins
const myPackagePath = fsPath.dirname(packageJSONPath)

const pkgJSON = JSON.parse(readFileSync(packageJSONPath, { encoding : 'utf8' }))
const { version: pkgVersion } = pkgJSON

const pluginsPath = fsPath.join(COMPLY_SERVER_PLUGIN_DIR(), 'server')

// Helper to check SDLC_* environment variables
const checkSdlcEnv = (suffix, converter = (x) => x) => {
  const value = process.env[`SDLC_${suffix}`]
  return value !== undefined ? converter(value) : undefined
}

const explicitPlugins = [
  '@liquid-labs/liq-controls',
  '@liquid-labs/liq-credentials',
  '@liquid-labs/liq-integrations',
  '@liquid-labs/liq-integrations-issues-github',
  '@liquid-labs/liq-orgs',
  '@liquid-labs/liq-projects',
  '@liquid-labs/liq-work',
  '@liquid-labs/plugable-projects-audit',
  '@liquid-labs/plugable-server-documentation',
  '@liquid-labs/sdlc-projects-badges-coverage',
  '@liquid-labs/sdlc-projects-badges-github-workflows',
  '@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd',
  '@liquid-labs/sdlc-projects-workflow-local-node-build'
]

const appInit = async(options) => await superInit({
  name                      : COMPLY_SERVER_CLI_NAME(),
  version                   : pkgVersion,
  apiSpecPath               : COMPLY_API_SPEC_PATH(),
  pluginsPath,
  explicitPlugins,
  serverHome                : myPackagePath,
  dynamicPluginInstallDir   : COMPLY_HOME(),
  noAPIUpdate               : checkSdlcEnv('NO_API_UPDATE', (v) => v === 'true' || v === '1'),
  ...options
})

export { appInit }
