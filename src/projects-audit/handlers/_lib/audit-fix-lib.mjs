import { httpSmartResponse } from '@liquid-labs/http-smart-response'
import { fixReport, npmAutoFix, npmCheck } from 'npm-check-plus'

import { commonAuditPathParameters } from './common-audit-path-parameters'

const doAuditFix = async({ app, projectName, req, res }) => {
  const { dryRun, removePackages, updateMinimums } = req.vars

  const { projectPath: packageRoot } = await app.ext._liqProjects.playgroundMonitor.getProjectData(projectName)

  const auditReport = await npmCheck({ packageRoot })
  const fixResults = await npmAutoFix({ checkResults : auditReport, dryRun, packageRoot, removePackages, updateMinimums })
  const report = fixReport(fixResults)

  httpSmartResponse({ msg : report, data : fixResults, req, res })
}

const getAuditFixEndpointParameters = ({ workDesc }) => {
  const help = {
    name        : `Project audit fix (${workDesc})`,
    summary     : `Fixes ${workDesc} project audit issues.`,
    description : `Fixes many ${workDesc} project  security vulnerabilities as well as outdated, missing, and extraneous package dependencies issues. See also '/projects/audit' to get an audit report. The following actions are taken:
- \`npm audit fix\` is run to address any automaticaly fixable vulnerabilities
- missing packages are installed
- when \`removePackages\` is set true, extra packages are reomved (see parameter documentation)
- outdated packages are updated; pre-release package 'minimums' are updated while production pacagkes are updated but the semver range spec is kept as is unless \`updateMinimums\` is set to true (see parameter documentation).`
  }

  const method = 'put'

  const parameters = [
    ...commonAuditPathParameters,
    {
      name        : 'dryRun',
      isBoolean   : true,
      description : 'When set to true, no changes are actually changed, but a report of what would be done is generated.'
    },
    {
      name        : 'removePackages',
      isBoolean   : true,
      dascription : 'By default, "extra" packages are not automatically removed as there are many instances in which they are used indirectly. E.g., the "sdlc-resource" packages used to provide Babel transpiling or Jest unit testing. Setting this parameter to true will remove these packaes. You can exclude false positives (and protect them from removal) by listing known good packages which would otherwise look unused as an array of glob patterns in \'_npm-check-plus.depcheck.ignoreMatches\' in the \'package.json\' file.'
    },
    {
      name        : 'updateMinimums',
      isBoolean   : true,
      description : 'By default production package semver range specificatinos are left in place. Setting `updateMinimums` true will make the current \'wanted\' package the new minimum. Note, pre-production package minimums are always updated.'
    }
  ]

  return { help, method, parameters }
}

export { doAuditFix, getAuditFixEndpointParameters }
