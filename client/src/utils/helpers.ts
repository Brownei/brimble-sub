export function getRepoName(url: string) {
  let cleanUrl = url.replace(/\.git$/, '')
  const parts = cleanUrl.split('/')
  let repoName = parts[parts.length - 1]
  return repoName.split('?')[0]
}
