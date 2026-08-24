/* global afterEach describe expect jest test */
import { determineCurrentMilestone } from '../determine-current-milestone'

const mockPaginate = jest.fn()

jest.mock('@liquid-labs/octocache', () => ({
  Octocache : jest.fn().mockImplementation(() => ({ paginate : mockPaginate }))
}))

const makeApp = () => ({
  ext : {
    credentialsDB : {
      getToken : jest.fn().mockResolvedValue('fake-github-api-token')
    }
  }
})

describe('determineCurrentMilestone', () => {
  afterEach(() => {
    mockPaginate.mockReset()
  })

  test('returns the number of the milestone whose title is the minimum version', async() => {
    mockPaginate.mockResolvedValue([
      { title : '1.2.0', number : 12 },
      { title : '1.1.0', number : 11 },
      { title : '2.0.0', number : 20 }
    ])
    const app = makeApp()

    const result = await determineCurrentMilestone({ app, cache : {}, gitHubOrg : 'liquid-labs', projectBasename : 'foo' })

    expect(result).toBe(11)
    expect(app.ext.credentialsDB.getToken).toHaveBeenCalledWith('GITHUB_API')
  })

  test('ignores non-version milestone titles', async() => {
    mockPaginate.mockResolvedValue([
      { title : '1.2.0', number : 12 },
      { title : 'backlog', number : 99 },
      { title : '1.1.0', number : 11 }
    ])
    const app = makeApp()

    const result = await determineCurrentMilestone({ app, cache : {}, gitHubOrg : 'liquid-labs', projectBasename : 'foo' })

    expect(result).toBe(11)
  })

  test('returns undefined when no milestone title matches the computed minimum', async() => {
    mockPaginate.mockResolvedValue([])
    const app = makeApp()

    const result = await determineCurrentMilestone({ app, cache : {}, gitHubOrg : 'liquid-labs', projectBasename : 'foo' })

    expect(result).toBeUndefined()
  })
})
