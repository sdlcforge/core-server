import * as fs from 'node:fs/promises'
import * as fsPath from 'node:path'

import { CredentialsDB, CREDS_PATH_STEM } from '@liquid-labs/liq-credentials-db'

const setup = async({ app, cache, registerPathVar, serverConfigRoot }) => {
  const credsDir = fsPath.join(serverConfigRoot, CREDS_PATH_STEM)
  await fs.mkdir(credsDir, { recursive : true })

  // `@liquid-labs/liq-credentials-db`'s `CredentialsDB` receives `serverConfigRoot` here as an ordinary
  // constructor argument — it never touches `app.ext` and never sees the `setup()` argument object
  // directly, so no capability kind names it in this component's manifest declaration
  // (package.json `plugable.host.builtins[0].components`). This component's own `requires:
  // setupArg:serverConfigRoot` is the coupling that stands in for it: if the framework drops that
  // name, this component's `setup()` fails before reaching this line, and `liq-credentials-db` fails
  // with it. `liq-credentials-db`'s coverage is transitive through this requirement, not a capability
  // of its own.
  const credentialsDB = new CredentialsDB({ app, cache, serverConfigRoot })
  app.ext.credentialsDB = credentialsDB

  setupPathResolvers({ app, registerPathVar })
}

const setupPathResolvers = ({ app, registerPathVar }) => {
  registerPathVar('credential', {
    validationRe   : '(?:[A-Z0-9][A-Z0-9_]*)',
    optionsFetcher : () => app.ext.credentialsDB.listSupported().map(({ key }) => key)
  })
}

export { setup }
