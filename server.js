const express = require('express')

const app = express()
const port = 8080

app.use(express.json()); 

require('./app/routes.js')(app);

app.listen(port, () => {
  console.log(`webhookq running at localhost:${port}`)
})