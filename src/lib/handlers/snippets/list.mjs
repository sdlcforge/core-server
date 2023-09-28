import { httpSmartResponse } from '@liquid-labs/http-smart-response'

const method = 'get'
const path = ['snippets', 'list']
const parameters = []

const func = ({ reporter }) => (req, res) => {
  reporter.isolate()
  
  const msg = 'hello'

  httpSmartResponse({ msg, req, res })
}

export { func, method, parameters, path }
