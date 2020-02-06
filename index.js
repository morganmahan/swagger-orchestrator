const _ = require('lodash')

let previousCalls = []

module.exports = apiSpec => {
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

      if (callConfig['x-returnToInitialState']) {
        emptyPreviousCalls()
        return next()
      }
      addToPreviousCalls(req) // Add the current call to the list of previous calls
      return next()
    }
    return res.send(`Endpoint ${req.url} ${req.method} does not exist`) // Endpoint not in specification
  }
}

const checkPrerequisiteCalls = preRequisiteCalls => {
  if (previousCalls.length === 0) return false
  let checksPassed = true
  const immediatePreReqCalls = []
  preRequisiteCalls.forEach(preReqCall => {
    if (preReqCall[Object.keys(preReqCall)[0]].immediate) immediatePreReqCalls.push(preReqCall)
  })
  if (immediatePreReqCalls && immediatePreReqCalls.length > 0) { // If any pre requisite needs to have been the call before this one
    checksPassed = checkImmediatePrerequisiteCalls(immediatePreReqCalls)
  } else {
    preRequisiteCalls.forEach(preReqCall => { // Loop through the endpoints prerequisite calls
      const preReqProperties = getPrerequisiteProperties(preReqCall)
      let matchingCall = false
      previousCalls.forEach(call => { // Checking each prereq against any previous calls to the API
        if (_.isEqual(preReqProperties.check, call)) matchingCall = true
      })
      if (!matchingCall) checksPassed = false
    })
  }
  return checksPassed
}

const checkImmediatePrerequisiteCalls = preRequisiteCalls => {
  let checksPassed = true
  preRequisiteCalls.forEach(preReqCall => {
    const preReqProperties = getPrerequisiteProperties(preReqCall)
    let matchingCall = false
    for (let i = previousCalls.length; i > previousCalls.length - preRequisiteCalls.length; i--) { // Loop over the last (however many immediate prereqs exist) previous calls
      if (_.isEqual(preReqProperties.check, previousCalls[i-1])) matchingCall = true
    }
    if (!matchingCall) checksPassed = false
  })
  return checksPassed
}

const getPrerequisiteProperties = preRequisiteCall => {
  const preReqEndpoint = Object.keys(preRequisiteCall)[0]
  const preReqProperties = preRequisiteCall[preReqEndpoint]
  const preReqCheck = {[preReqEndpoint]: preReqProperties.method}
  return {
    endpoint: preReqEndpoint,
    properties: preReqProperties,
    check: preReqCheck
  }
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

const addToPreviousCalls = req => {
  previousCalls.push({ [req.url.slice(1)]: req.method.toLowerCase() })
}

const emptyPreviousCalls = () => {
  previousCalls = []
}
