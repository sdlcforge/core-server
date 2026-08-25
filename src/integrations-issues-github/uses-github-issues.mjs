const usesGitHubIssues = ({ pkgJSON }) => {
  const bugsURL = pkgJSON?.bugs?.url || ''

  return !!bugsURL.match(/^https:\/\/(www\.)?github.com\//)
}

export { usesGitHubIssues }
