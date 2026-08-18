import { httpSmartResponse } from '@liquid-labs/http-smart-response'
import { generateReport, npmCheck } from 'npm-check-plus'

import { commonAuditPathParameters } from './common-audit-path-parameters'

const doAudit = async({ app, projectName, req, res }) => {
  const { projectPath: packageRoot } = await app.ext._liqProjects.playgroundMonitor.getProjectData(projectName)

  const auditReport = await npmCheck({ packageRoot })
  const { report, code } = generateReport(auditReport)

  const msg = report + (code !== 0 ? '\n\n<error>There were errors in retrieving the audit.<rst>' : '')

  httpSmartResponse({ msg, data : auditReport, req, res })
}

const getAuditEndpointParameters = ({ workDesc }) => {
  const help = {
    name        : `Project audit (${workDesc})`,
    summary     : `Auidts the ${workDesc} project.`,
    description : `Audits the ${workDesc} project for security vulnerabilities as well as outdated, missing, or extraneous package dependencies. See also '/projects/audit-fix' to automatically address many issues.`
  }

  const method = 'get'

  const parameters = [...commonAuditPathParameters]

  return { help, method, parameters }
}

export { doAudit, getAuditEndpointParameters }
