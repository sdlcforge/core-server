/* global describe expect test */
import { usesGitHubIssues } from '../uses-github-issues'

describe('usesGitHubIssues', () => {
  test('is true with github issues URL', () => {
    const pkgJSON = { bugs : { url : 'https://github.com/foo/bar/issues' } }

    expect(usesGitHubIssues({ pkgJSON })).toBe(true)
  })

  test('is false with github issues URL', () => {
    const pkgJSON = { bugs : { url : 'https://jira.com/foo/bar/issues' } }

    expect(usesGitHubIssues({ pkgJSON })).toBe(false)
  })
})
