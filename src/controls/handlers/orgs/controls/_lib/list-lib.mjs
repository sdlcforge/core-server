import createError from 'http-errors'

import { commonOutputParams, formatOutput } from '@liquid-labs/liq-handlers-lib'

const allFields = ['name', 'source', 'description', 'controls']
const defaultFields = allFields

const mdFormatter = ({ data, title, fields }) => {
  let md = `# ${title}\n\n`

  if (data?.lengeth > 0) {
    md += '- ' + data
      .map(({ name, source, description }) => `___${name}___ (_${source}_):\\\n  ${description}\n`)
      .join('- ')
  }

  return md
}

const textFormatter = ({ data, fields }) => {
  let text = ''
  if (data?.lengeth > 0) {
    text += '- ' + data
      .map(({ name, source, description }) => `${name} (${source}):\\\n  ${description}\n`)
      .join('- ')
  }

  return text
}

const terminalFormatter = ({ data, fields }) => {
  let text = ''
  if (data?.lengeth > 0) {
    text += '- ' + data
      .map(({ name, source, description }) => `<em>${name}<rst> (<code>${source}<rst>):\\\n  ${description}\n`)
      .join('- ')
  }

  return text
}

const doListControls = ({ app, orgKey, reporter, req, res }) => {
  const org = app.ext._liqOrgs.orgs[orgKey]
  if (org === undefined) {
    throw createError.NotFound(`No such or  g '${orgKey}'.`)
  }

  const data = org.controls.list()

  formatOutput({
    basicTitle : `${orgKey} controls`,
    data,
    allFields,
    defaultFields,
    mdFormatter,
    terminalFormatter,
    textFormatter,
    reporter,
    req,
    res,
    ...req.vars
  })
}

const getControlsListEndpointParameters = ({ workDesc }) => {
  const help = {
    name        : 'orgs controls list',
    summary     : `Lists controls for the ${workDesc} organization.`,
    description : `Lists the controls loaded into the ${workDesc} organization.`
  }

  const method = 'get'

  const parameters = commonOutputParams()

  return { help, method, parameters }
}

export { doListControls, getControlsListEndpointParameters }
