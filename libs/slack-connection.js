sbConnection = {}
module.exports = sbConnection;

const SlackBot = require('slackbots');
const logger = require('./logger');
var dbConnection = require('./db-connection')

var bot;

sbConnection.createBot = function(){
    // Slack Connection
    logger.log(process.env.BOT_TOKEN)
    bot = new SlackBot({
        token: `${process.env.BOT_TOKEN}`,
        name: 'appdemo_legacy_bot'
    })
}

sbConnection.attachListeners = function(){
    bot.on('start', () => {
        const params = {
            icon_emoji: ':robot_face:'
        }    
    })
    
    // Error Handle
    bot.on('error', (err) => {
        logger.log(err);
    })
    
    // Message Handler
    bot.on('message', (data) => {
        if(data.type !== 'message') {
            return;
        }
        //Check if message is directed to Bot // TODO: confirm ID Later, updated as per channel
        if(data.text.indexOf('<@U021FMX8FSQ>') == 0){
            // logger.log("Message to Bot", data)
            let message = data.text.replace('<@U021FMX8FSQ>', '').trim()
            handleMessage(message, data);
        }
    })
}



function handleMessage(message, data) {
    let action = message.split('|')[0]
    let resource_name = message.split('|')[1]
    // let duration = message.split('|')[2]
    // let owner = data.user;
    // let claimTime = new Date().now()
    switch (action) {
        case 'add':
            dbConnection.addNewResource(resource_name)
        break;
        case 'remove':
            dbConnection.removeExistingResource(resource_name)
        break;
    
        default:
            runHelp()
            break;
    }
}


function runHelp() {
    const params = {
        icon_emoji: ':question:'
    }

    bot.postMessageToChannel(
        'test1',
        `Some Help text.... will provide later`,
        params
    );
}

sbConnection.sendMessageToChannel = function(message, params = {}) {
    bot.postMessageToChannel(
        'test1',
        `${message}`,
        params
    );
}
