import { getOrg } from './_lib/get-org'
import { listParameters } from './_lib/parameters-lib'

const method = 'get'
const path = ['orgs', ':orgKey', 'parameters', ':parameterKey', 'detail']
const parameters = []

const func = ({ app, reporter, registerPathVar }) => {
  registerPathVar('parameterKey', {
    // Captures `app` from this enclosing `func` argument rather than accepting an `app`
    // parameter the way `orgs`' own `orgKey` optionsFetcher does (`src/orgs/setup.mjs:66`).
    // `optionsFetcher` is invoked lazily at request time -- well after the deferred 'load orgs'
    // setup method has populated `app.ext._liqOrgs.orgs` -- so the closure is safe, and it is
    // the simplest correct option of the two.
    optionsFetcher : ({ orgKey }) => {
      // An unknown `orgKey` yields an empty option list rather than a thrown error: this path
      // feeds shell completion, not a request response.
      const org = app.ext._liqOrgs?.orgs?.[orgKey]
      if (org === undefined) return []

      const parameters = listParameters(org)
      return parameters.map((p) => p.name)
    },
    // Excludes `__proto__`, `constructor`, and `prototype` as exact path segments to close the
    // input half of security follow-up DGt0(b) (see plan/notes/orgs-security-findings.md):
    // the previous pattern let each of those through as a legitimate-looking dotted segment,
    // which reaches `settings.mjs`'s prototype-chain-walking `updateSetting`/`getSetting`. The
    // sink-side hardening is a separate concern; a future simplification of this regex must not
    // silently reopen this exclusion. The boundary check is "not followed by another identifier
    // character" rather than an end-of-segment/end-of-string anchor, because this pattern is
    // interpolated into a larger route regex (`.../parameters/:parameterKey/detail` or
    // `.../set`) that has more literal path segments after this one; embedding a real `$` here
    // would wrongly demand end-of-input at this point and break those routes.
    validationRe : '(?:[.](?!(?:__proto__|constructor|prototype)(?![_a-zA-Z0-9-]))[_a-zA-Z][_a-zA-Z0-9-]*)+'
  })

  return (req, res) => {
    const org = getOrg({ app, orgKey : req.vars.orgKey })

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
