/* global expect */

const testCallsImplied = async(doFunc, func) => {
  let result
  doFunc.mockImplementation(async({ projectName }) => { result = projectName })

  const reporterMock = { isolate : () => {} }
  const reqMock = { get : () => __dirname }

  const handler = func({ reporter : reporterMock })
  await handler(reqMock)

  expect(result).toBe('@sdlcforge/core-server')
}

export { testCallsImplied }
