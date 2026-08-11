import { existsSync, readFileSync } from 'node:fs'
import { copyFile, mkdir } from 'node:fs/promises'
import * as fsPath from 'node:path'

import {
  COMPLY_API_SPEC_PATH,
  COMPLY_SERVER_CLI_NAME,
  COMPLY_SERVER_CONFIG_ROOT,
  COMPLY_SERVER_PLUGIN_DIR,
  COMPLY_HOME
} from '@liquid-labs/comply-defaults'
import { appInit as superInit } from '@liquid-labs/plugable-express'

const packageJSONPathProd = fsPath.resolve(__dirname, '..', 'package.json')
const packageJSONPathTest = fsPath.resolve(__dirname, '..', '..', 'package.json')
const packageJSONPath = existsSync(packageJSONPathProd) ? packageJSONPathProd : packageJSONPathTest
// This is the core-server package directory; it's where the packaged 'server-settings.yaml'
// defaults live, seeded into the XDG-based serverConfigRoot on first run (see
// seedServerSettings below).
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

// `@liquid-labs/plugable-express` reads '<serverConfigRoot>/server-settings.yaml' during
// appInit and, when the file is absent, writes an empty '{}' there. This repo packages a
// 'server-settings.yaml' (carrying the 'registries:' list) at its own root, which
// `serverConfigRoot` used to *be*; now that the root moves to the XDG data dir, the
// packaged defaults must be seeded there explicitly or they're silently lost on first run.
// First-run only (never overwrites a file that already exists — a user's edits there are
// authoritative) and non-fatal (a seed failure must never prevent the server from starting).
const seedServerSettings = async(serverConfigRoot) => {
  try {
    const destPath = fsPath.join(serverConfigRoot, 'server-settings.yaml')
    if (existsSync(destPath)) return

    const srcPath = fsPath.join(myPackagePath, 'server-settings.yaml')
    await mkdir(serverConfigRoot, { recursive : true })
    await copyFile(srcPath, destPath)
  }
  catch (e) {
    // Seeding is best-effort; a read-only filesystem or permission error must not block
    // server start.
    console.error(`Warning: failed to seed packaged server-settings.yaml defaults into '${serverConfigRoot}':`, e.message)
  }
}

const appInit = async(options) => {
  // Only seed the default, comply-defaults-resolved root; a caller-supplied
  // `serverConfigRoot` (as both unit tests provide) wins via the `...options` spread
  // below, and seeding a directory the caller didn't ask to be populated is wrong.
  if (options?.serverConfigRoot === undefined) {
    await seedServerSettings(COMPLY_SERVER_CONFIG_ROOT())
  }

  return await superInit({
    name                    : COMPLY_SERVER_CLI_NAME(),
    version                 : pkgVersion,
    apiSpecPath             : COMPLY_API_SPEC_PATH(),
    pluginsPath,
    explicitPlugins,
    serverConfigRoot        : COMPLY_SERVER_CONFIG_ROOT(),
    dynamicPluginInstallDir : COMPLY_HOME(),
    noAPIUpdate             : checkSdlcEnv('NO_API_UPDATE', (v) => v === 'true' || v === '1'),
    ...options
  })
}

export { appInit }
