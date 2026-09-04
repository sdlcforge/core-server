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

import { builtinPluginsFor } from './builtin-plugins'

const packageJSONPathProd = fsPath.resolve(__dirname, '..', 'package.json')
const packageJSONPathTest = fsPath.resolve(__dirname, '..', '..', 'package.json')
const packageJSONPath = existsSync(packageJSONPathProd) ? packageJSONPathProd : packageJSONPathTest
// This is the core-server package directory; it's where the packaged 'server-settings.yaml'
// defaults live, seeded into the XDG-based serverConfigRoot on first run (see
// seedServerSettings below).
const myPackagePath = fsPath.dirname(packageJSONPath)

const pkgJSON = JSON.parse(readFileSync(packageJSONPath, { encoding : 'utf8' }))
const { name: pkgName, version: pkgVersion } = pkgJSON

// `npmName` is read from `package.json` rather than hardcoded, so the in-tree plugin identity
// follows the package if it is ever renamed. `summary` cannot come from `package.json` (its
// `description` is the empty string) and stays a literal in './builtin-plugins'.
const builtinPlugins = builtinPluginsFor({ npmName : pkgName, version : pkgVersion })

const pluginsPath = fsPath.join(COMPLY_SERVER_PLUGIN_DIR(), 'server')

// Helper to check SDLC_* environment variables
const checkSdlcEnv = (suffix, converter = (x) => x) => {
  const value = process.env[`SDLC_${suffix}`]
  return value !== undefined ? converter(value) : undefined
}

// `@liquid-labs/liq-controls`, `@liquid-labs/liq-credentials`, and
// `@liquid-labs/liq-integrations-issues-github` are deliberately absent: their source is absorbed
// in-tree at `src/controls/`, `src/credentials/`, and `src/integrations-issues-github/` and
// registered through `builtinPlugins` above. Loading one both ways at once is a defect in every
// case, but it does not always announce itself the same way. For a donor that contributes routes
// or path variables it is a hard startup crash -- `plugable-express` throws
// `Non-unique command path: <path>` on a second registration of the same array-style path, and
// `Path variable '<name>' is already registered.` on a second `registerPathVar` call for the same
// name (`liq-credentials` registers `credential`). `liq-integrations-issues-github` registers
// neither, so its double-load is *silent*: its two integration providers are simply registered
// twice. That is a stronger reason for each entry's removal and the `builtin-plugins.mjs` wire-in
// to always land together, not a weaker one.
const explicitPlugins = [
  '@liquid-labs/sdlc-projects-badges-coverage',
  '@liquid-labs/sdlc-projects-badges-github-workflows',
  '@liquid-labs/sdlc-projects-workflow-github-node-jest-cicd',
  '@liquid-labs/sdlc-projects-workflow-local-node-build',
  '@sdlcforge/dev-core'
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
    builtinPlugins,
    explicitPlugins,
    serverConfigRoot        : COMPLY_SERVER_CONFIG_ROOT(),
    dynamicPluginInstallDir : COMPLY_HOME(),
    noAPIUpdate             : checkSdlcEnv('NO_API_UPDATE', (v) => v === 'true' || v === '1'),
    ...options
  })
}

export { appInit, explicitPlugins }
