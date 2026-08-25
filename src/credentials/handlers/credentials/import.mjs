import fsPath from 'node:path'

import { CREDS_PATH_STEM } from '@liquid-labs/liq-credentials-db'
import { httpSmartResponse } from '@liquid-labs/http-smart-response'

const method = 'put'
const path = ['credentials', ':credential', 'import']
const parameters = [
  {
    name        : 'replace',
    isBoolean   : true,
    description : 'By default, trying to import a credential of the same type results in an error, unless `replace` is true.'
  },
  {
    name          : 'path',
    required      : true,
    isSingleValue : true,
    description   : 'Local path to the credential file.'
  },
  {
    name        : 'copyToStorage',
    isBoolean   : true,
    description : 'When set, copies the credential file from [`path`](#param-path) to centralized storage under the `$LIQ_HOME/credentials` (`LIQ_HOME` is typically `$HOME/.liq`). Otherwise by default, we reference the credentials in-place.'
  }
]

const func = ({ app }) => async(req, res) => {
  const credDB = app.ext.credentialsDB
  const { copyToStorage, credential, path: srcPath, replace } = req.vars

  const destPath = copyToStorage === true ? fsPath.join(app.ext.serverConfigRoot, CREDS_PATH_STEM) : undefined

  await credDB.import({ destPath, key : credential, srcPath, replace })

  httpSmartResponse({ msg : `Imported '${credential}' credentials.`, req, res })
}

export { func, parameters, path, method }
