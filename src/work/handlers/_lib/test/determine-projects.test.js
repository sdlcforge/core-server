/* global describe expect test beforeAll */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import * as fsPath from 'node:path'

import { determineCurrentBranch } from '@liquid-labs/git-toolkit'

import { determineProjects } from '../determine-projects'

const FIXTURE_BRANCH = 'orgA/proj1/1'

// The fixture at 'data/playground/orgA/proj1' is a package.json-only ordinary file (not a git submodule/gitlink);
// this creates the nested git repo the test data represents, at test-run time, from that ordinary file. Runs
// against 'test-staging/', which is gitignored and rebuilt from scratch on every 'make test', so this is a no-op
// once a repo already exists and otherwise free and self-cleaning.
const initializeFixtureRepo = (repoPath) => {
  if (existsSync(fsPath.join(repoPath, '.git'))) return

  const execOpts = { cwd : repoPath, stdio : 'ignore' }
  execFileSync('git', ['init', '-q', '-b', FIXTURE_BRANCH], execOpts)
  execFileSync('git', ['add', 'package.json'], execOpts)
  execFileSync('git', [
    '-c', 'user.email=fixture@liquid-labs.com',
    '-c', 'user.name=Test Fixture',
    '-c', 'commit.gpgsign=false',
    'commit', '-q', '-m', 'added package'
  ], execOpts)
}

describe('determineProjects', () => {
  const projectPath = fsPath.join(__dirname, 'data', 'playground', 'orgA', 'proj1')
  const req = { get : (header) => header === 'X-CWD' ? projectPath : undefined }
  const mockWorkUnit = {
    projects : [{ name : '@orgA/proj1', private : true }]
  }
  const workDB = {
    requireData : (key) => key === 'orgA/proj1/1' ? mockWorkUnit : throw new Error(`Unexpected: ${key}`)
  }

  beforeAll(() => {
    initializeFixtureRepo(projectPath)

    // Positive assertion that the fixture is the fixture: a lost/misconfigured fixture repo fails here with a
    // legible message naming the wrong branch, rather than surfacing as an inscrutable expectation diff further
    // down in the test.each rows below.
    const currentBranch = determineCurrentBranch({ projectPath })
    expect(currentBranch).toBe(FIXTURE_BRANCH)
  })

  test.each([
    [false, 'orgA/proj1/1', undefined, ['@orgA/proj1']],
    [true, undefined, undefined, ['@orgA/proj1']],
    [false, undefined, ['@orgA/proj1'], ['@orgA/proj1']],
    [true, undefined, ['orgA/proj2'], ['@orgA/proj1']],
    [false, 'orgA/proj1/1', ['@orgA/proj1'], ['@orgA/proj1']]
  ])('(all: %p, workKey: %s, projects: %p) -> %p', async(all, workKey, projects, expectedResult) => {
    const [selectedProjects, workKeyOut, workUnit] =
      await determineProjects({ all, cliEndpoint : 'test', projects, req, workDB, workKey })

    expect(selectedProjects).toEqual(expectedResult)
    expect(workKeyOut).toBe('orgA/proj1/1')
    expect(workUnit).toEqual(mockWorkUnit)
  })

  test('throws with bad work key', () => {
    expect(() => determineProjects({ cliEndpoint : 'test', req, workDB, workKey : 'orgA/blah-blah-blah/1' }))
  })
})
