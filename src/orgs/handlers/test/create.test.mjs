/* global afterAll beforeAll describe expect test */
import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'
import * as os from 'node:os'

import { func } from '../create'

const reqMock = (vars) => ({ accepts : () => 'application/json', vars })

const resMock = () => {
  const self = {
    out    : '',
    status : () => self,
    type   : () => self,
    send   : (chunk) => { if (chunk !== undefined) self.out += chunk; return self },
    write  : (chunk) => { self.out += chunk; return self },
    end    : () => self
  }

  return self
}

describe('POST /orgs/create/:newOrgKey', () => {
  let playgroundPath

  beforeAll(async() => {
    playgroundPath = await fs.mkdtemp(fsPath.join(os.tmpdir(), 'orgs-create-test-'))
  })

  afterAll(async() => {
    await fs.rm(playgroundPath, { force : true, recursive : true })
  })

  const appMock = () => ({ ext : { _liqProjects : { playgroundPath } } })

  test('creates the org directory and responds with a 2xx body carrying the org fields', async() => {
    const localDataRoot = fsPath.join(playgroundPath, '@acme', 'acme')
    const req = reqMock({ commonName : 'Acme', legalName : 'Acme, Inc.', localDataRoot, newOrgKey : '@acme' })
    const res = resMock()

    await func({ app : appMock() })(req, res)

    const expectedDir = fsPath.join(localDataRoot, 'org')
    const stat = await fs.stat(expectedDir)
    expect(stat.isDirectory()).toBe(true)

    const body = JSON.parse(res.out)
    const expectedRelativeDir = fsPath.join('@acme', 'acme', 'org')
    expect(body).toEqual({
      commonName : 'Acme',
      legalName  : 'Acme, Inc.',
      newOrgKey  : '@acme',
      directory  : expectedRelativeDir
    })
    // The response must not disclose the server's absolute filesystem layout: the 'directory'
    // field is playground-root-relative, not the fully resolved absolute path.
    expect(fsPath.isAbsolute(body.directory)).toBe(false)
    expect(body.directory).not.toBe(expectedDir)
  })

  test('does not throw on a repeat call against an existing directory and still responds', async() => {
    const localDataRoot = fsPath.join(playgroundPath, '@acme', 'acme')
    const req = reqMock({ commonName : 'Acme', legalName : 'Acme, Inc.', localDataRoot, newOrgKey : '@acme' })
    const res = resMock()

    await expect(func({ app : appMock() })(req, res)).resolves.toBeUndefined()

    const expectedDir = fsPath.join(localDataRoot, 'org')
    const stat = await fs.stat(expectedDir)
    expect(stat.isDirectory()).toBe(true)
    expect(res.out.length).toBeGreaterThan(0)
  })

  describe('containment rejection', () => {
    test('rejects a localDataRoot entirely outside the playground', async() => {
      const req = reqMock({ commonName : 'Evil', legalName : 'Evil, Inc.', localDataRoot : '/tmp/escape', newOrgKey : '@evil' })
      const res = resMock()

      await expect(func({ app : appMock() })(req, res)).rejects.toMatchObject({ status : 400 })

      await expect(fs.stat('/tmp/escape')).rejects.toMatchObject({ code : 'ENOENT' })
    })

    test('rejects a localDataRoot that escapes the playground via ..', async() => {
      const localDataRoot = fsPath.join(playgroundPath, '..', 'escape')
      const req = reqMock({ commonName : 'Evil', legalName : 'Evil, Inc.', localDataRoot, newOrgKey : '@evil' })
      const res = resMock()

      await expect(func({ app : appMock() })(req, res)).rejects.toMatchObject({ status : 400 })

      await expect(fs.stat(fsPath.resolve(localDataRoot))).rejects.toMatchObject({ code : 'ENOENT' })
    })

    test('rejects a sibling directory sharing a name prefix with the playground', async() => {
      const localDataRoot = playgroundPath + '-evil'
      const req = reqMock({ commonName : 'Evil', legalName : 'Evil, Inc.', localDataRoot, newOrgKey : '@evil' })
      const res = resMock()

      await expect(func({ app : appMock() })(req, res)).rejects.toMatchObject({ status : 400 })

      await expect(fs.stat(localDataRoot)).rejects.toMatchObject({ code : 'ENOENT' })
    })

    describe('symlink escape', () => {
      let symlinkEscapeRoot
      let symlinkTarget
      let evilLink

      beforeAll(async() => {
        // A real symlink planted under the playground root pointing *outside* it. A purely
        // lexical containment check (string-comparing `fsPath.resolve`/`fsPath.relative` output)
        // would see `evilLink` as lexically inside `playgroundPath` and let it through, even
        // though following the symlink escapes the playground root entirely -- this is exactly
        // the bypass the containment check must close.
        symlinkEscapeRoot = await fs.mkdtemp(fsPath.join(os.tmpdir(), 'orgs-create-symlink-escape-'))
        symlinkTarget = fsPath.join(symlinkEscapeRoot, 'outside-playground')
        await fs.mkdir(symlinkTarget, { recursive : true })

        evilLink = fsPath.join(playgroundPath, 'evil-link')
        await fs.symlink(symlinkTarget, evilLink, 'dir')
      })

      afterAll(async() => {
        await fs.rm(evilLink, { force : true })
        await fs.rm(symlinkEscapeRoot, { force : true, recursive : true })
      })

      test('rejects a localDataRoot that resolves through a symlink escaping the playground', async() => {
        const localDataRoot = fsPath.join(evilLink, '@evil', 'evil')
        const req = reqMock({ commonName : 'Evil', legalName : 'Evil, Inc.', localDataRoot, newOrgKey : '@evil' })
        const res = resMock()

        await expect(func({ app : appMock() })(req, res)).rejects.toMatchObject({ status : 400 })

        // Before the fix, this would have succeeded and created a directory at the symlink's real
        // target, outside the fake playground root entirely.
        await expect(fs.stat(fsPath.join(symlinkTarget, '@evil'))).rejects.toMatchObject({ code : 'ENOENT' })
      })
    })
  })

  test("produces a clear error, not a TypeError, when 'app.ext._liqProjects' is missing", async() => {
    const req = reqMock({ commonName : 'Acme', legalName : 'Acme, Inc.', localDataRoot : fsPath.join(playgroundPath, '@acme', 'acme'), newOrgKey : '@acme' })
    const res = resMock()

    let caught
    try {
      await func({ app : { ext : {} } })(req, res)
    }
    catch (e) {
      caught = e
    }

    expect(caught).toBeDefined()
    expect(caught).not.toBeInstanceOf(TypeError)
    expect(caught.status).toBe(500)
  })
})
