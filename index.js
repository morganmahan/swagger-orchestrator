const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const orchestrator = require('./src/orchestrator')
const port = 3000

const sessionDetails = {
  username: undefined
}

const users = [
  'morganmahan',
  'joebloggs'
]

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(orchestrator)

app.get('/whoami', (req, res) => {
  sessionDetails.username ? res.status(200) : res.status(401)
  return res.send(sessionDetails.username || 'You are not logged in')
})

app.post('/login', (req, res) => {
  if (sessionDetails.username) return res.send('User already authenticated')
  if (req.body.username && req.body.password) {
    const userTryingToAuthenticate = req.body.username
    if (users.includes(userTryingToAuthenticate)) {
      sessionDetails.username = userTryingToAuthenticate
      res.status(200)
      return res.send('Success! ' + userTryingToAuthenticate + ' is now authenticated')
    } else {
      res.status(401)
      return res.send('Please check username and password')
    }
  } else {
    res.status(400)
    return res.send('Please send username and password')
  }
})

app.get('/logout', (req, res) => {
  if (sessionDetails.username) {
    const userLoggedOut = sessionDetails.username
    sessionDetails.username = null
    res.status(200)
    return res.send(userLoggedOut + ' is now logged out')
  } else {
    res.status(400)
    return res.send('You cannot logout if you are not logged in')
  }
})

app.listen(port,  () => {
  console.log("Server is running on "+ port +" port")
})
