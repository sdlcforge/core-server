/* global describe expect test */
import { func } from '../list'

describe('GET:/credentials/list', () => {
  const listData = [{ name : 'GITHUB_SSH' }, { name : 'GITHUB_API' }]
  const credentialsDBMock = {
    list        : () => listData,
    verifyCreds : () => {}
  }
  const appMock = { ext : { credentialsDB : credentialsDBMock } }

  const reqMock = {
    vars    : { verify : false },
    accepts : () => 'application/json'
  }

  let result
  const resMock = {
    json : (json) => { result = json }
  }

  test('lists the DB credential entries', () => {
    const handler = func({ app : appMock })
    handler(reqMock, resMock)

    expect(result).toEqual(listData)
  })
})
