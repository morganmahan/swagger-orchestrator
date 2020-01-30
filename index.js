const _ = require('lodash')

let previousCalls = []

module.exports = (apiSpec) => {
  return (req, res, next) => {
    const callConfig = _.get(apiSpec, `paths.${req.url}.${req.method.toLowerCase()}`)
    if (callConfig) { // If the endpint is specified
      const preRequisiteCalls = callConfig['x-prerequisite']
      if (preRequisiteCalls && preRequisiteCalls.length > 0) { // If the endpoint has prerequisite calls
        if (checkPrerequisiteCalls(preRequisiteCalls) === false) return res.send(`All prerequisite endpoints for ${req.url} ${req.method} have not been called`)
      }

      const exclusiveCalls = callConfig['x-exclusive']
      if (exclusiveCalls && exclusiveCalls.length > 0) {
        if (checkExclusiveCalls(exclusiveCalls) === false) return res.send(`Endpoint ${req.url} ${req.method} cannot be called with an exclusive endpoint`)
      }

      if (callConfig && callConfig['x-returnToInitialState']) previousCalls = []
      previousCalls.push({ [req.url.slice(1)]: req.method.toLowerCase() }) // Add the current call to the list of previous calls
      return next()
    }
    return res.send(`Endpoint ${req.url} ${req.method} does not exist`) // Endpoint not in specification
  }
}

const checkPrerequisiteCalls = preRequisiteCalls => {
  if (previousCalls.length === 0) return false
  preRequisiteCalls.forEach(preReqCall => { // Loop through the endpoints prerequisite calls
    let matchingCall = false
    previousCalls.forEach(call => { // Checking each prereq against the previous calls to the API
      if (_.isEqual(preReqCall, call)) matchingCall = true // if the prerequisite call has been previously called, check the next prerequisite call
    })
    if (!matchingCall) return false // if the prerequisite call has not been called previously, the requirements are not satisfied
    return true
  })
}

const checkExclusiveCalls = exclusiveCalls => {
  let noExclusiveEndpointCalled = true
  exclusiveCalls.forEach(call => {
    previousCalls.forEach(prevCall => {
      if (_.isEqual(prevCall, call)) noExclusiveEndpointCalled = false
    })
  })
  return noExclusiveEndpointCalled
}
