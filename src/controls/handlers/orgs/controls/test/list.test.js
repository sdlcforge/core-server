/* global describe expect jest test */
import { func } from '../list'

import { doListControls } from '../_lib/list-lib'

jest.mock('../_lib/list-lib', () => ({
  ...jest.requireActual('../_lib/list-lib'),
  doListControls : jest.fn()
}))

describe('GET:/orgs/XXX/controls/list', () => {
  test("calls 'doList' with 'orgKey'", () => {
    let calledOrg
    doListControls.mockImplementation(({ orgKey }) => { calledOrg = orgKey })

    const mockReq = { vars : { orgKey : 'foo' } }

    const handler = func({})
    handler(mockReq)

    expect(calledOrg).toBe('foo')
  })
})
