
const dotenv = require('dotenv')
dotenv.config()

const PORT = process.env.PORT || 3000;
const express = require('express');

const logger = require('./libs/logger')
const dbConnection = require('./libs/db-connection')
const sbConnection = require('./libs/slack-connection')

//Initialize App
const app = express();
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
})

app.get('/', (req, res) => {
    console.log('Someone tried to access via URL')
    res.send(
        "<h1 style='text-align:center'>Things are looking good!!!</h1>"
    )
})
// Connection to MongoDB
dbConnection.connect();
dbConnection.startCron();
//
sbConnection.createBot()
sbConnection.attachListeners()
