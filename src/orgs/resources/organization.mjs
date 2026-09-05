import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import * as fsPath from 'node:path'

import yaml from 'js-yaml'

import { Model } from '@liquid-labs/resource-model'

import { getSetting, requireSetting, updateSetting } from './lib/settings'

const Organization = class extends Model {
  #name
  #pkgName
  #projectPath
  #settings
  #settingsPath

  /**
   * Parameters:
   *
   * - `name`: (req, string) the name of the org, which follows the NPM scheme, starting with a '@'; e.g., '@acme'.
   * - `pkgName`: (req, string) the name of the NPM package which contains the org data. I.e., the org's "home" repo.
   *   This is conventionally something like '@acme/acme'.
   * - `projectPath`: (req, string) the local file system path to the project's data project indicated by `npmName`.
   */
  constructor({ name, pkgName, projectPath }) {
    super()

    this.#name = name
    this.#pkgName = pkgName
    this.#projectPath = projectPath

    // Kept on the instance (rather than recomputed) so `save()` writes back to exactly the path
    // the constructor read from and the two cannot drift apart.
    this.#settingsPath = fsPath.join(projectPath, 'data', 'org', 'settings.yaml')
    try {
      const settingsContent = readFileSync(this.#settingsPath, { encoding : 'utf8' })
      this.#settings = yaml.load(settingsContent)
    }
    catch (e) { // TODO: warn?
      if (e.code === 'ENOENT') {
        this.#settings = {}
      }
      else {
        // A non-ENOENT read error (e.g., EACCES, corrupt file) previously left `#settings`
        // `undefined`, which made every later `getSetting`/`updateSetting` call throw an
        // unrelated `TypeError`. Rethrow so the real cause surfaces instead.
        throw e
      }
    }
  }

  get name() {
    return this.#name
  }

  get key() {
    return this.#name
  }

  get pkgName() {
    return this.#pkgName
  }

  get projectPath() {
    return this.#projectPath
  }

  get commonName() { return this.getSetting('COMMON_NAME') }

  get legalName() { return this.getSetting('LEGAL_NAME') }

  getSetting(keyPath) {
    return getSetting(this.#settings, keyPath)
  }

  updateSetting(keyPath, value) {
    return updateSetting(this.#settings, keyPath, value)
  }

  requireSetting(keyPath) {
    return requireSetting(this.#settings, keyPath)
  }

  // Overrides `Model.save()` (`@liquid-labs/resource-model`, `src/Model.mjs:74-80`) rather than
  // calling `super.save()`. The base implementation destructures `errors` off `this.validate()`
  // without awaiting it -- `validate()` is `async`, so `errors` is always `undefined` there and
  // `errors.length` throws on every call, making every `Model.save()` reject. Even a working base
  // implementation would persist nothing here: it only iterates `#rootItemManagers`/`#subModels`,
  // both empty for `Organization`, which loads and owns `#settings` itself. Do not "simplify" this
  // back to `super.save()` -- it cannot succeed and has nothing to do.
  async save() {
    await mkdir(fsPath.dirname(this.#settingsPath), { recursive : true })
    await writeFile(this.#settingsPath, yaml.dump(this.#settings), { encoding : 'utf8' })
  }
}

export { Organization }
