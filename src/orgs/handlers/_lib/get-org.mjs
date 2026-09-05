import createError from 'http-errors'

// Reads the org registry directly off `app.ext._liqOrgs.orgs` rather than importing the shared
// handlers library's `getOrgFromKey` helper (see plan/notes/orgs-handler-defect-analysis.md).
// Modeled on `@sdlcforge/core-server`'s `src/controls/handlers/orgs/controls/_lib/list-lib.mjs`,
// which reads the same registry the same way.
//
// `app.ext._liqOrgs` cannot be missing in a correctly-booted server: `src/orgs/setup.mjs`'s
// 'prepare org dependencies' setup method (`deps: ['!']`, run first) creates it before any
// request is served. But handler tests build `app` mocks by hand, so this guards the container
// explicitly rather than letting a missing mock field surface as an opaque `TypeError`.
const getOrg = ({ app, orgKey }) => {
  const orgs = app.ext._liqOrgs?.orgs
  if (orgs === undefined) {
    throw new Error("'app.ext._liqOrgs.orgs' is not initialized; the org registry is unavailable.")
  }

  const org = orgs[orgKey]
  if (org === undefined) {
    throw createError.NotFound(`No such org '${orgKey}'.`)
  }

  return org
}

export { getOrg }
