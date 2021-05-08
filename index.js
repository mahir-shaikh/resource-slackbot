
const dotenv = require('dotenv')
const logger = require('./libs/logger')
const dbConnection = require('./libs/db-connection')
const sbConnection = require('./libs/slack-connection')

dotenv.config()



// Connection to MongoDB
dbConnection.connect();

//
sbConnection.createBot()
sbConnection.attachListeners()
