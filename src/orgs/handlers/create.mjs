import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import createError from 'http-errors'

import { httpSmartResponse } from '@liquid-labs/http-smart-response'

// Resolves the realpath of the nearest *existing* ancestor of `candidatePath` (walking up from
// `candidatePath` itself towards the filesystem root). `candidatePath` itself, and any number of
// its trailing segments, may not exist yet -- `create.mjs` is about to `fs.mkdir` a new directory
// tree -- but every existing ancestor's realpath must still be checked, because a symlink placed
// anywhere along that ancestor chain can redirect the eventual `fs.mkdir` outside the intended
// boundary even though the candidate path's own lexical string never leaves it.
const realpathOfNearestExistingAncestor = async(candidatePath) => {
  let current = candidatePath
  // eslint-disable-next-line no-constant-condition -- walks up until it finds an existing
  // ancestor or exhausts the path at the filesystem root.
  while (true) {
    try {
      return await fs.realpath(current)
    }
    catch (e) {
      if (e.code !== 'ENOENT') {
        throw e
      }
      const parent = fsPath.dirname(current)
      if (parent === current) {
        // Reached the filesystem root without finding anything that exists; this should not
        // happen on any real filesystem (the root always exists), but avoid an infinite loop.
        throw e
      }
      current = parent
    }
  }
}

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
  //
  // A purely lexical (`fsPath.resolve`/`fsPath.relative` string) comparison does not resolve
  // symlinks: a pre-existing symlink anywhere under the playground root pointing outside it would
  // let a `localDataRoot` that lexically resolves inside the playground root still cause
  // `fs.mkdir(..., { recursive: true })` to create a directory at the symlink's real target,
  // anywhere the server process can write. Resolve both sides to their real, symlink-free paths
  // before comparing. `localDataRoot`'s own directory tree does not exist yet in the common case
  // (this handler is about to create it), so walk up to the nearest existing ancestor and
  // `realpath` that instead -- any symlink along that ancestor chain still redirects the eventual
  // `fs.mkdir`, even though the candidate path's own lexical string never leaves the boundary.
  const playgroundRoot = await fs.realpath(fsPath.resolve(liqProjects.playgroundPath))
  const candidateRoot = fsPath.resolve(localDataRoot)
  const candidateRealRoot = await realpathOfNearestExistingAncestor(candidateRoot)
  const relativeToPlayground = fsPath.relative(playgroundRoot, candidateRealRoot)
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
