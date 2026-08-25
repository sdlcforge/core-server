import { GH_BASE_URL } from './constants'

const getIssueURL = ({ gitHubOrg, project, ref }) => {
  return `${GH_BASE_URL}/${gitHubOrg}/${project}/issues/${ref}`
}

export { getIssueURL }
