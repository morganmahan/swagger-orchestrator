const _ = require('lodash')

let previousCalls = []
let nextCalls = { all: false, endpoints: [] }

module.exports = apiSpec => {
  return (req, res, next) => {
    const callConfig = _.get(apiSpec, `paths.${req.url}.${req.method.toLowerCase()}`)
    // If the endpint is specified
    if (callConfig) {
      // if no next or previous calls, the next call must be an initial state
      if (nextCalls.endpoints && nextCalls.endpoints.length === 0 && previousCalls && previousCalls.length === 0) {
        if (!callConfig['x-initialState']) return res.send(`The next call is expected to be an initial state, ${req.url} ${req.method} is not`)
      }

      const preRequisiteCalls = callConfig['x-prerequisite']
      if (preRequisiteCalls && preRequisiteCalls.endpoints && preRequisiteCalls.endpoints.length > 0) { // If the endpoint has prerequisite calls
        if (checkPrerequisiteCalls(preRequisiteCalls) === false) return res.send(`All prerequisite endpoints for ${req.url} ${req.method} have not been called`)
        // TODO send back what prerequisite endpoints havent been called yet
      }

      if (nextCalls && nextCalls.endpoints && nextCalls.endpoints.length > 0) {
        if (checkPostrequisiteCalls(req) === false) {
          return res.send(`${req.url} ${req.method} is not an allowed next call.\nThe allowed next calls are: ${convertListOfEndpointsToString(nextCalls.endpoints)}` )
        }
        removeEndpointFromNextCalls(req)
        // TODO
        // if not all calls are required, once one postreq has been called, we set the atLeastOne flag on nextCalls
        // if this flag is true, we can then call either more of the existing postrequisites
        // OR the postrequisites of a call that has been made from this set of postreqs
        if (!nextCalls.all && !nextCalls.atLeastOne) {
          nextCalls.atLeastOne = true
        }
      }

      const exclusiveCalls = callConfig['x-exclusive']
      if (exclusiveCalls && exclusiveCalls.length > 0) {
        if (checkExclusiveCalls(exclusiveCalls) === false) return res.send(`Endpoint ${req.url} ${req.method} cannot be called with an exclusive endpoint`)
        // TODO send back the exclusive endpoint that has been called that causes this call to be rejected
      }

      if (callConfig['x-returnToInitialState']) {
        emptyPreviousCalls()
        emptyNextCalls()
        return next()
      }

      // TODO
      // if the current endpoint has postrequisites but all === true && endpoints.length > 0, need to add the postrequisites to
      // nextCalls once all the current nextCalls have been satisfied
      // if !nextCalls.all, should also allow either the current nextCalls to still be called, or the postrequisites of one of nextCalls
      // to be called, thus entering the next part of the workflow
      const postrequisiteCalls = callConfig['x-postrequisite']
      if (postrequisiteCalls && postrequisiteCalls.endpoints && postrequisiteCalls.endpoints.length > 0) {
        const postrequisiteCallsCopy = JSON.parse(JSON.stringify(callConfig['x-postrequisite']))
        if (postrequisiteCallsCopy && postrequisiteCallsCopy.endpoints && postrequisiteCallsCopy.endpoints.length > 0) {
          postrequisiteCallsCopy.endpoints = postrequisiteCallsCopy.endpoints.map(postreqCall => {
            return getOpenAPIEndpointProperties(postreqCall).check
          })
          nextCalls = postrequisiteCallsCopy
        }
      }

      addToPreviousCalls(req)
      return next()
    }
    return res.send(`Endpoint ${req.url} ${req.method} does not exist in the specification`)
  }
}

const checkPrerequisiteCalls = preRequisiteCalls => {
  if (previousCalls.length === 0 || !preRequisiteCalls.endpoints || preRequisiteCalls.endpoints.length === 0) return false
  return preRequisiteCalls.all ? checkAllPrerequisiteCalls(preRequisiteCalls.endpoints)
    : checkSinglePrerequisiteCall(preRequisiteCalls.endpoints)
}

const checkSinglePrerequisiteCall = preRequisiteCalls => {
  if (!previousCalls || previousCalls.length === 0) return false
  let prevCall = previousCalls[previousCalls.length-1]
  matchingCall = preRequisiteCalls.find(preReqCall => {
    return _.isEqual(prevCall, getOpenAPIEndpointProperties(preReqCall).check)
  })
  return matchingCall !== undefined
}

const checkAllPrerequisiteCalls = preRequisiteCalls => {
  let checksPassed = true
  preRequisiteCalls.forEach(preReqCall => {
    const preReqProperties = getOpenAPIEndpointProperties(preReqCall)
    let matchingCall = false
    for (let i = previousCalls.length; i > previousCalls.length - preRequisiteCalls.length; i--) { // Loop over the last (however many immediate prereqs exist) previous calls
      if (_.isEqual(preReqProperties.check, previousCalls[i-1])) matchingCall = true
    }
    if (!matchingCall) checksPassed = false
  })
  return checksPassed
}

const checkPostrequisiteCalls = req => {
  const request = convertEndpointFormat(req)
  const matchingCall = nextCalls.endpoints.find(call => {
    return _.isEqual(request, call)
  })
  return matchingCall !== undefined
}

const getOpenAPIEndpointProperties = openAPIPath => {
  const openAPIEndpoint = Object.keys(openAPIPath)[0]
  const openAPIProperties = openAPIPath[openAPIEndpoint]
  const openAPICheck = {[openAPIEndpoint]: openAPIProperties.method}
  return {
    endpoint: openAPIEndpoint,
    properties: openAPIProperties,
    check: openAPICheck
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

const convertListOfEndpointsToString = endpoints => {
  return endpoints.reduce((uncalledEndpoints, endpoint) => {
    const name = Object.keys(endpoint)[0]
    const method = endpoint[name]
    uncalledEndpoints += `\n/${name} ${method.toUpperCase()}`
    return uncalledEndpoints
  }, '')
}

const convertEndpointFormat = req => {
  return { [req.url.slice(1)]: req.method.toLowerCase() }
}

const addToPreviousCalls = req => {
  previousCalls.push(convertEndpointFormat(req))
}

const emptyPreviousCalls = () => {
  previousCalls = []
}

const removeEndpointFromNextCalls = req => {
  const request = convertEndpointFormat(req)
  if (nextCalls.endpoints.length > 1) {
    nextCalls.endpoints = nextCalls.endpoints.filter(endpoint => {
      return _.isEqual(endpoint, request)
    })
  }
}

const emptyNextCalls = () => {
  nextCalls = {all: false, endpoints: []}
}
