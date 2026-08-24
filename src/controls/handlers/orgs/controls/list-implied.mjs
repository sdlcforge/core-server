import createError from 'http-errors'

import { getPackageOrgAndBasename } from '@liquid-labs/npm-toolkit'

import { doListControls, getControlsListEndpointParameters } from './_lib/list-lib'

const { help, method, parameters } = getControlsListEndpointParameters({ workDesc : 'named' })

const path = ['orgs', 'controls', 'list']

const func = ({ app, reporter }) => async(req, res) => {
  reporter = reporter.isolate()

  const cwd = req.get('X-CWD')
  if (cwd === undefined) {
    throw createError.BadRequest("Called 'work document' with implied work, but 'X-CWD' header not found.")
  }
  const { org: orgKey } = getPackageOrgAndBasename({ pkgDir : cwd })

  await doListControls({ app, orgKey, reporter, req, res })
}

export { func, help, method, parameters, path }
