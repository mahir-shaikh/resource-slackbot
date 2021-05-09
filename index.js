
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
// Connection to MongoDB
dbConnection.connect();
dbConnection.startCron();
//
sbConnection.createBot()
sbConnection.attachListeners()
