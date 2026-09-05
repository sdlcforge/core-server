import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import createError from 'http-errors'

import { httpSmartResponse } from '@liquid-labs/http-smart-response'

const help = {
  name        : 'Organization create',
  summary     : 'Creates a new organization locally.',
  description : `Creates a new, empty organization. An organization may or may not be tied to a legal entity, a club, department, etc. Organizations have an organization structure based on roles, staff associated to roles, projects, contracts, relationships with third-party vendors, etc.

    This currently creates only the organization's <code>org<rst> data directory under <code>localDataRoot<rst>; it does not yet write <code>org.json<rst> or otherwise register the organization for discovery.`
}

const method = 'post'
const path = ['orgs', 'create', ':newOrgKey']
const parameters = [
  {
    name        : 'commonName',
    required    : true,
    description : 'The common name by which the organization is referred to in casual speech.'
  },
  {
    name        : 'legalName',
    description : 'The organizations legal name, if any.'
  },
  {
    name        : 'localDataRoot',
    required    : true,
    description : 'The local directory in which to save `./orgs/org.json` for the newly created organization.'
  }
]

const func = ({ app }) => async(req, res) => {
  const { commonName, legalName, localDataRoot, newOrgKey } = req.vars

  const liqProjects = app.ext._liqProjects
  if (liqProjects?.playgroundPath === undefined) {
    throw createError.InternalServerError("Server is missing the 'projects' component's 'app.ext._liqProjects.playgroundPath'; cannot verify 'localDataRoot' containment.")
  }

  // Anchor containment on the playground root: it is both the security boundary (the only
  // directory tree the server should ever be told to write into on a caller's say-so) and the
  // correctness boundary (`orgs`' 'load orgs' setup method only discovers orgs by scanning this
  // same tree, so a directory created outside it could never be found anyway).
  const playgroundRoot = fsPath.resolve(liqProjects.playgroundPath)
  const candidateRoot = fsPath.resolve(localDataRoot)
  const relativeToPlayground = fsPath.relative(playgroundRoot, candidateRoot)
  const isContained = !fsPath.isAbsolute(relativeToPlayground) && !relativeToPlayground.startsWith('..')

  if (isContained === false) {
    throw createError.BadRequest("'localDataRoot' must resolve to the playground root or a descendant of it.")
  }

  const localRootDir = fsPath.join(candidateRoot, 'org')

  await fs.mkdir(localRootDir, { recursive : true })

  const data = { commonName, legalName, newOrgKey, directory : localRootDir }

  httpSmartResponse({
    data,
    msg : `Created organization '${newOrgKey}' data directory at '${localRootDir}'.`,
    req,
    res
  })
}

export { func, help, parameters, path, method }
