import { GH_BASE_URL } from './constants'

const getProjectURL = ({ gitHubOrg, project }) => {
  return `${GH_BASE_URL}/${gitHubOrg}/${project}`
}

export { getProjectURL }
