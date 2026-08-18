// TODO: we should do more with this; expose liq-specific info.
import { doAudit, getAuditEndpointParameters } from './_lib/audit-lib'

const path = ['projects', ':projectName', 'audit']

const { help, method, parameters } = getAuditEndpointParameters({ workDesc : 'named' })

const func = ({ app, reporter }) => async(req, res) => {
  reporter = reporter.isolate()

  const { projectName } = req.vars

  await doAudit({ app, projectName, req, res })
}

export {
  func,
  help,
  method,
  parameters,
  path
}
