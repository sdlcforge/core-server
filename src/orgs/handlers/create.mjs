import * as fs from 'node:fs/promises'

const help = {
  name        : 'Organization create',
  summary     : 'Creates a organization new organization locally.',
  description : `Creates a new, empty organization. An organization may or may tied to a legal entity, a club, department, etc. Organizations have an organization structure based on roles, staff associated to roles, projects, contracts, relationships with third-party vendors, etc.

    The root data element (<code>org.json<rst>) is saved to <code>localDataRoot<rst> with sub-components saved in federated-json. It is expected (though not currently verified) that <code>localDataRoot<rst> is located in a git repository.`
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
  // commented out to pass lint until we rebuild 'create'
  const { /* commonName, legalName, */localDataRoot /* newOrgKey */ } = req.vars
  const localRootDir = localDataRoot + '/org'

  await fs.mkdir(localRootDir, { recursive : true })

  // TODO
}

export { func, help, parameters, path, method }
