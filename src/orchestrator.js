const _ = require('lodash')
const endpoints = {
  '/login': {
    POST: {
      prerequisite: []
    }
  },
  '/whoami': {
    GET: {
      prerequisite: [{ '/login': 'POST' }],
      exclusive: [{ '/exclusiveEndpoint': 'GET' }]
    }
  },
  '/exclusiveEndpoint': {
    GET: {
      prerequisite: [{ '/login': 'POST' }],
      exclusive: [{ '/whoami': 'GET' }]
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
  const callConfig = _.get(endpoints, `${req.url}.${req.method}`)
  if (callConfig && callConfig.returnToInitialState) previousCalls = []
  if (callConfig) { // If the endpint is specified
    let requirementsSatisfied = true
    if (callConfig.prerequisite && callConfig.prerequisite.length > 0) { // If the endpoint has prerequisite calls
      if (previousCalls.length === 0) requirementsSatisfied = false
      callConfig.prerequisite.forEach(preReqCall => { // Loop through the endpoints prerequisite calls
        let matchingCall = false
        previousCalls.forEach(call => { // Checking each prereq against the previous calls to the API
          if (_.isEqual(preReqCall, call)) matchingCall = true // if the prerequisite call has been previously called, check the next prerequisite call
        })
        if (!matchingCall) requirementsSatisfied = false // if the prerequisite call has not been called previously, the requirements are not satisfied
      })
    }
    if (callConfig.exclusive && callConfig.exclusive.length > 0) {
      callConfig.exclusive.forEach(call => {
        previousCalls.forEach(prevCall => {
          if (_.isEqual(prevCall, call)) requirementsSatisfied = false
        })
      })
    }
    previousCalls.push({ [req.url]: req.method }) // Add the current call to the list of previous calls
    if (!requirementsSatisfied) return res.send(`Requirements not satisfied for ${req.url} ${req.method}`)
    return next()
  }
  return res.send(`Endpoint ${req.url} ${req.method} does not exist`) // Endpoint not in specification
}
