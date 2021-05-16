
const dotenv = require('dotenv')
dotenv.config()

const logger = require('./libs/logger')
const dbConnection = require('./libs/db-connection')
const sbConnection = require('./libs/slack-connection')
const cronJob = require('./libs/cron-job')

// Connection to MongoDB
dbConnection.connect().then(() => {
    logger.log("MongoDB Connected Successfully");
    // Start Cron Job
    cronJob.startCron()
}).catch((err) => {
    logger.log("MongoDB Connecttion failed:", err);
});

// Create Slack bot
sbConnection.createBot()
sbConnection.attachListeners()