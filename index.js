const dotenv = require('dotenv')
dotenv.config()

const logger = require('./libs/logger')
const dbConnect = require('./libs/db-connect')
const sbConnection = require('./libs/slack-connection')
const smlConnection = require('./libs/slack-modal-listener')
// const sslConnection = require('./libs/slack-slash-listener')
const cronJob = require('./libs/cron-job')
const express = require('express');

// Connection to MongoDB
dbConnect.connect().then(() => {
    logger.log("MongoDB Connected Successfully");
    // Start Cron Job
    cronJob.startCron()
}).catch((err) => {
    logger.log("MongoDB Connecttion failed:", err);
});

// Create Slack bot
sbConnection.createBot().then(() => {
    // Store in variable
    sbConnection.setBot()
    logger.log("⚡️ Bolt app is running!!");

    // Attach Message Listener
    sbConnection.attachListeners()
    sbConnection.attachMessageAction()

    // Attach Slash Listener
    // sslConnection.attachSlashListener()

    // Attach Modal Listeners
    smlConnection.attachModalCommand()
    smlConnection.attachModalAction()
    smlConnection.attachViewActions()
    smlConnection.attachMessageAction()

}).catch((err) => {
    console.log("Slackbot creation failed:", err);
})


// var publicDir = require('path').join(__dirname, '/assets');
const app = express();
// app.use(express.static(publicDir));
app.get("/", (req, res) => {
    res.send("Thing are looking good!!!")
});

// (async function () {
//     const url = await ngrok.connect();
//     console.log(url)
// })();

app.listen(process.env.PORT || 9999, () => {
    console.log(`Example app listening at http://localhost:${process.env.PORT || 9999}`)
})

