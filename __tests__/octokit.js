class FakeApp {
  // eslint-disable-next-line class-methods-use-this
  getSignedJsonWebToken() {
    return 'jwt-token'
  }

  // eslint-disable-next-line class-methods-use-this
  getInstallationAccessToken() {
    return 'installation-token'
  }
}


const defaultFakeRequest = req => Promise.reject(new Error(`Request ${req} is not mocked`))
function createFakeRequest(fakeRequest = defaultFakeRequest) {
  const xFakeRequest = (req, options) => fakeRequest(req, options)

  xFakeRequest.extend = (newReq, response) => {
    const newFakeRequest = (req, options) => {
      if (req === newReq) {
        return response(options)
      }
      return fakeRequest(req, options)
    }

    return createFakeRequest(newFakeRequest)
  }

  return xFakeRequest
}

const defaultRequest = createFakeRequest()

function createOctokit(request = defaultRequest) {
  return {
    App: FakeApp,
    request,
    extend(req, response) {
      return createOctokit(request.extend(req, response))
    },
  }
}

const emptyOctokit = createOctokit()

exports.baseOctokit = emptyOctokit.extend('GET /repos/:owner/:repo/installation', () => Promise.resolve({
  data: { id: '123' },
}))
