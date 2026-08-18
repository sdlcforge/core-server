import { getOrgFromKey } from '@liquid-labs/liq-handlers-lib'

import { listParameters } from './_lib/parameters-lib'

const method = 'get'
const path = ['orgs', ':orgKey', 'parameters', ':parameterKey', 'detail']
const parameters = []

const func = ({ app, model, reporter, registerPathVar }) => {
  registerPathVar('parameterKey', {
    optionsFetcher : ({ orgKey }) => {
      const org = model.orgs[orgKey]
      const parameters = listParameters(org)
      return parameters.map((p) => p.name)
    },
    validationRe : '(?:[.][_a-zA-Z][_a-zA-Z0-9-]*)+'
  })

  return (req, res) => {
    // KNOWN BROKEN: plugable-express's load-plugins.js never passes `model` to plugin
    // handlers (only { npmName, handlers, reporter, setupData, cache }), so `model` is
    // always undefined here and this throws TypeError on every request. The org registry
    // actually lives at app.ext._liqOrgs.orgs. Migrated as-is from @liquid-labs/liq-orgs
    // (pre-existing defect, not introduced by the dev-core consolidation).
    // Tracked: sdlcforge/dev-core plan/followups.yaml id jY7C.
    const org = getOrgFromKey({ model, params : req.vars, res })
    if (org === false) return

    const { parameterKey } = req.vars

    const value = org.getSetting(parameterKey)

    const accepts = ['text/terminal', 'text/plain', 'application/json']
    const responseType = req.accepts(accepts)
    if (responseType === false) {
      res.status(406).send(`Cannot provide response for '${req.get('content-type')}'; response can be provided in the following formats: ` + accepts.join(', '))
      return
    }
    // else, let's respond!

    res.type(responseType)

    switch (responseType) {
    case 'text/terminal':
      res.send('<code>' + parameterKey + '<rst>: <em>' + value + '<rst>'); break
    case 'text/plain':
      res.send(parameterKey + ': ' + value); break
    case 'application/json':
      res.send({ name : parameterKey, value })
    }
  }
}

export { func, parameters, path, method }
