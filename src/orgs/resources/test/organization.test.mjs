/* global afterAll beforeAll describe expect test */

import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import { Organization } from '../organization'

describe('Organization', () => {
  let keyTestProjectPath

  beforeAll(async() => {
    // A fresh temp dir with no 'data/org/settings.yaml' yet, so the constructor exercises the
    // ENOENT ('no settings file') branch rather than any real settings content.
    keyTestProjectPath = await fs.mkdtemp(fsPath.join(os.tmpdir(), 'organization-key-test-'))
  })

  afterAll(async() => {
    await fs.rm(keyTestProjectPath, { force : true, recursive : true })
  })

  test('key equals the constructor\'s name', () => {
    const org = new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath : keyTestProjectPath })
    expect(org.key).toBe('@acme')
    expect(org.key).toBe(org.name)
  })

  describe('save()', () => {
    let projectPath

    afterAll(async() => {
      await fs.rm(projectPath, { force : true, recursive : true })
    })

    test('a round trip of updateSetting, save, and a fresh load reads the new value back', async() => {
      projectPath = await fs.mkdtemp(fsPath.join(os.tmpdir(), 'organization-test-'))

      const org = new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath })
      // settings.yaml does not exist yet under this fresh temp dir -- exercises the ENOENT
      // (first-ever write) branch.
      org.updateSetting('COMMON_NAME', 'Acme Corp')

      await org.save()

      const settingsPath = fsPath.join(projectPath, 'data', 'org', 'settings.yaml')
      await expect(fs.access(settingsPath)).resolves.toBeUndefined()

      const reloaded = new Organization({ name : '@acme', pkgName : '@acme/acme', projectPath })
      expect(reloaded.commonName).toBe('Acme Corp')
    })
  })
})
