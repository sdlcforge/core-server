import { commonOutputParams, formatOutput } from '@liquid-labs/liq-handlers-lib'
import { CredentialsDB } from '@liquid-labs/liq-credentials-db'

const method = 'get'
const path = ['credentials', 'list']
const parameters = [
  {
    name        : 'verify',
    isBoolean   : true,
    description : '(Re-)verifies credentials.'
  },
  ...commonOutputParams()
]

const mdFormatter = ({ data: creds, title }) =>
  `# ${title}\n\n${creds.map((c) => `- ${c.name} (__${c.key}__/${c.status}):\n  ${c.description}`).join('\n')}\n`

const terminalFormatter = ({ data: creds, title }) =>
  creds.map((c) => `- ${c.name} (<em>${c.key}<rst>/<bold>${c.status}<rst>):\n  ${c.description}`).join('\n')

const textFormatter = ({ data: creds, title }) => terminalFormatter(creds, title).replaceAll(/<[a-z]+>/g, '')

const func = ({ app, reporter }) => async(req, res) => {
  const { verify = false } = req.vars

  const credDB = app.ext.credentialsDB

  credDB.verifyCreds({ reVerify : verify })

  const data = credDB.list()

  formatOutput({
    basicTitle    : 'Local Credentials',
    data,
    mdFormatter,
    terminalFormatter,
    textFormatter,
    reporter,
    req,
    res,
    allFields     : CredentialsDB.allFields,
    defaultFields : CredentialsDB.defaultFields,
    ...req.vars
  })
}

export { func, parameters, path, method }
