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
  const callConfig = _.get(endpoints, `${req.url}.${req.method}`)
  if (callConfig && callConfig.returnToInitialState) previousCalls = []
  previousCalls.push({ [req.url]: req.method }) // Add the current call to the list of previous calls
  if (callConfig) { // If the endpint is specified
    if (callConfig.prerequisite.length > 0) { // If the endpoint has prerequisite calls
      let prerequisiteReqsSatisfied = true
      callConfig.prerequisite.forEach(preReqCall => { // Loop through the endpoints prerequisite calls
        let matchingCall = false
        previousCalls.forEach(call => { // Checking each prereq against the previous calls to the API
          if (_.isEqual(preReqCall, call)) matchingCall = true // if the prerequisite call has been previously called, check the next prerequisite call
        })
        if (!matchingCall) prerequisiteReqsSatisfied = false // if the prerequisite call has not been called previously, the requirements are not satisfied
      })
      if (!prerequisiteReqsSatisfied) return res.send(`Prequisite call required for ${req.url} ${req.method}`)
      return next()
    }
    return next() // No prerequisites. Let the call happen
  }
  return res.send(`Endpoint ${req.url} ${req.method} does not exist`) // Endpoint not in specification
}
