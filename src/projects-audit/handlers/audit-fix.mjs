// TODO: we should do more with this; expose liq-specific info.
import { doAuditFix, getAuditFixEndpointParameters } from './_lib/audit-fix-lib'

const path = ['projects', ':projectName', 'audit-fix']

const { help, method, parameters } = getAuditFixEndpointParameters({ workDesc : 'named' })

const func = ({ app, reporter }) => async(req, res) => {
  reporter = reporter.isolate()

  const { projectName } = req.vars

  await doAuditFix({ app, projectName, req, res })
}

export {
  func,
  help,
  method,
  parameters,
  path
}
