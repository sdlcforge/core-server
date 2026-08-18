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
  // KNOWN BROKEN: plugable-express's load-plugins.js never passes `model` to plugin
  // handlers (only { npmName, handlers, reporter, setupData, cache }), so `model` is
  // always undefined here and this throws TypeError on every request. The org registry
  // actually lives at app.ext._liqOrgs.orgs. Migrated as-is from the retired liq-orgs package
  // (pre-existing defect, not introduced by the dev-core consolidation).
  // Tracked: sdlcforge/dev-core plan/followups.yaml id jY7C.
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
