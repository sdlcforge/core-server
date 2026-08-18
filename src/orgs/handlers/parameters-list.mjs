import { commonOutputParams, formatOutput, getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

import { listParameters } from './_lib/parameters-lib'

const method = 'get'
const path = ['orgs', ':orgKey', 'parameters', 'list?']
const parameters = commonOutputParams() // option func setup on 'fields' below

const defaultFields = ['name', 'value']
const allFields = [...defaultFields]
parameters.find((o) => o.name === 'fields').optionsFunc = () => allFields

const mdFormatter = (parameters, title) =>
  `# ${title}\n\n${parameters.map((p) => `- _${p.name}_: ${p.value}`).join('\n')}\n`

const terminalFormatter = (parameters, title) =>
  parameters.map((p) => `- <code>${p.name}<rst>: ${p.value}`).join('\n') + '\n'

const textFormatter = (parameters, title) =>
  parameters.map((p) => `- ${p.name}: ${p.value}`).join('\n') + '\n'

const func = ({ model, reporter }) => (req, res) => {
  const org = getOrgFromKey({ model, params : req.vars, res })
  if (org === false) return

  const parameters = listParameters(org)

  formatOutput({
    basicTitle : `Org ${org.name} Parameters`,
    data       : parameters,
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

export { func, parameters, path, method }
