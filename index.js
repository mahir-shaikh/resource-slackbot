
const dotenv = require('dotenv')
dotenv.config()
const logger = require('./libs/logger')
const dbConnection = require('./libs/db-connection')
const sbConnection = require('./libs/slack-connection')

// Connection to MongoDB
dbConnection.connect();
dbConnection.startCron();
//
sbConnection.createBot()
sbConnection.attachListeners()
