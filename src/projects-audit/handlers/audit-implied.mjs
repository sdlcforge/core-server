import createError from 'http-errors'

import { getPackageJSON } from '@liquid-labs/npm-toolkit'

import { doAudit, getAuditEndpointParameters } from './_lib/audit-lib'

const path = ['projects', 'audit']

const { help, method, parameters } = getAuditEndpointParameters({ workDesc : 'implied' })

const func = ({ app, reporter }) => async(req, res) => {
  reporter = reporter.isolate()

  const cwd = req.get('X-CWD')
  if (cwd === undefined) {
    throw createError.BadRequest("Called 'project audit' with implied project, but 'X-CWD' header not found.")
  }

  const { name: projectName } = await getPackageJSON({ pkgDir : cwd })

  await doAudit({ app, projectName, req, res })
}

export {
  func,
  help,
  method,
  parameters,
  path
}
