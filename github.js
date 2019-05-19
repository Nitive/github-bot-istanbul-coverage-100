const APP_ID = 31009

exports.createApp = async ({
  owner, repo, octokit, config,
}) => {
  const privateKey = config.githubAppPrivateKey
  const app = new octokit.App({
    id: APP_ID,
    privateKey,
  })

  const jwt = app.getSignedJsonWebToken()

  const { data: { id: installationId } } = await octokit.request('GET /repos/:owner/:repo/installation', {
    owner,
    repo,
    headers: {
      authorization: `Bearer ${jwt}`,
      accept: 'application/vnd.github.machine-man-preview+json',
    },
  })

  // contains the installation id necessary to authenticate as an installation
  const installationAccessToken = await app.getInstallationAccessToken({ installationId })

  return {
    request(req, query) {
      if (process.env.DEBUG_HTTP) {
        // eslint-disable-next-line no-console
        console.log(req, query)
      }

      return octokit.request(req, {
        owner,
        repo,
        ...query,
        headers: {
          authorization: `token ${installationAccessToken}`,
          accept: 'application/vnd.github.machine-man-preview+json',
          ...query.headers,
        },
      })
    },
  }
}
