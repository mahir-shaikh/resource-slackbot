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
        logger.log("Bot Error:");
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
    let action = message.split('|')[0] ? message.split('|')[0].trim() : null
    let resource_name = message.split('|')[1] ? message.split('|')[1].trim() : null
    let duration = message.split('|')[2] ? message.split('|')[2].trim() : 2 // integer will be in days, defualt 2 days
    let description = message.split('|')[3] ? message.split('|')[3].trim() : null
    let owner = data.user;
    let claimTime = new Date().getTime()
    let channelId = data.channel;
    switch (action) {
        case 'add':
            if(resource_name && resource_name.split(',').length > 1){
                dbConnection.addMultipleResource(resource_name.split(','), channelId)
            }else{
                dbConnection.addNewResource(resource_name, channelId)
            }
        break;
        case 'remove':
            dbConnection.removeExistingResource(resource_name, channelId)
        break;
        case 'claim':
            let durationInMilliSeconds = parseInt(duration)*24*60*60*1000;
            // let durationInMilliSeconds = parseInt(duration)*60*1000; // Store as minute for testing purpose
            dbConnection.claim(resource_name, durationInMilliSeconds, claimTime, owner, description, channelId)
        break;
        case 'release':
            dbConnection.release(resource_name, owner, channelId)
        break;
        case 'list':
            dbConnection.getAllResources(channelId)
        break
        case 'list available':
            dbConnection.getAvailableResources(channelId)
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

sbConnection.sendMessageToChannel = function(channelId, message, params = {}) {
    bot.postMessage(
        channelId,
        `${message}`,
        params
    );
}
