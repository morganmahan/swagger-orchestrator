# Swagger Orchestrator
An orchestrator enforcing restrictions in OpenAPI specifications to the calls made to your REST API

## Usage
Install the orchestrator into your Node API using:
```
npm install morganmahan/swagger-orchestrator
```

Include the orchestrator at the top of your `server.js`, `index.js` or equivalent file like so:
```
const orchestrator = require('swagger-orchestrator')
```
then use as express middleware, passing your Behavioural-OpenAPI specification as JSON to the orchestrator:
```
app.use(orchestrator(openApiSpecification))
```
