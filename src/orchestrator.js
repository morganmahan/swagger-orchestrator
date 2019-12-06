const _ = require('lodash')
const endpoints = {
  '/login': {
    POST: {
      prerequisite: []
    }
  },
  '/whoami': {
    GET: {
      prerequisite: [{ '/login': 'POST' }]
    }
  },
  '/logout': {
    GET: {
      prerequisite: [{ '/login': 'POST' }]
    },
    returnToInitialState: true
  }
}

let previousCalls = []

module.exports = (req, res, next) => {
  const callConfig = endpoints[req.url][req.method]
  if (callConfig.returnToInitialState) previousCalls = []
  previousCalls.push({ [req.url]: req.method }) // Add the current call to the list of previous calls
  if (callConfig) { // If the endpint is specified
    if (callConfig.prerequisite.length > 0) { // If the endpoint has prerequisite calls
      return callConfig.prerequisite.forEach(preReqCall => {
        if (previousCalls.length === 0) return res.send(`Prequisite call requirements not met`)
        return previousCalls.forEach(call => {
          if (!_.isEqual(preReqCall, call)) {
            const preReqEndpointName = Object.keys(preReqCall)[0]
            return res.send(`Prequisite call required: ${preReqEndpointName} ${preReqCall[preReqEndpointName]}`)
          }
          return next() // only works if the endpoint being called has ONE pre requisite call
        })
      })
    }
    return next() // No prerequisites. Let the call happen
  }
  return res.send(`Endpoint ${req.url} ${req.method} does not exist}`) // Endpoint not in specification
}
