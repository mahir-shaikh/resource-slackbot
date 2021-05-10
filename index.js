
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


//Keep app alive as Heroku sleeps in 30mins of inactivity
var http = require('http'); //importing http

function startKeepAlive() {
    setInterval(function() {
        var options = {
            host: 'appdemo-usage-bot.herokuapp.com',
            path: '/'
        };
        http.get(options, function(res) {
            res.on('data', function(chunk) {
                try {
                    // optional logging... disable after it's working
                    console.log("HEROKU RESPONSE: " + chunk);
                } catch (err) {
                    console.log(err.message);
                }
            });
        }).on('error', function(err) {
            console.log("Error: " + err.message);
        });
    }, 20 * 60 * 1000); // load every 20 minutes
}
if(process.env.KEEP_ALIVE){
    startKeepAlive();
}