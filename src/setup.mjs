import * as fsPath from 'node:path'

import { WorkDB } from './handlers/work/_lib/work-db'

const setup = ({ app, reporter, registerPathVar }) => {
  app.ext.constants.WORK_DB_PATH = fsPath.join(app.ext.serverConfigRoot, 'work', 'work-db.yaml')

  registerPathVar('workKey', {
    optionsFetcher : () => {
      const workDB = new WorkDB({ app })
      return workDB.getWorkKeys()
    },
    validationRe : 'work-[^/]+(?:/|%2[Ff])[^/]+(?:/|%2[Ff])[0-9]+'
  })
}

export { setup }
