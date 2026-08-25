import { GH_BASE_URL } from './constants'

const getPullRequestURLsByHead = ({ gitHubOrg, project, head }) => {
  return `${GH_BASE_URL}/${gitHubOrg}/${project}/pulls?q=head%3A${encodeURIComponent(head)}`
}

export { getPullRequestURLsByHead }
