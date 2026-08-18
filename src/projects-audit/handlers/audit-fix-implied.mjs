import createError from 'http-errors'

import { getPackageJSON } from '@liquid-labs/npm-toolkit'

import { doAuditFix, getAuditFixEndpointParameters } from './_lib/audit-fix-lib'

const path = ['projects', 'audit-fix']

const { help, method, parameters } = getAuditFixEndpointParameters({ workDesc : 'implied' })

const func = ({ app, reporter }) => async(req, res) => {
  reporter = reporter.isolate()

  const cwd = req.get('X-CWD')
  if (cwd === undefined) {
    throw createError.BadRequest("Called 'project audit' with implied project, but 'X-CWD' header not found.")
  }

  const { name: projectName } = await getPackageJSON({ pkgDir : cwd })

  await doAuditFix({ app, projectName, req, res })
}

export {
  func,
  help,
  method,
  parameters,
  path
}
