sbConnection = {}
module.exports = sbConnection;

const SlackBot = require('slackbots');
const logger = require('./logger');
var dbConnection = require('./db-connection')

var bot;
var botId;

sbConnection.createBot = function(){
    // Slack Connection
    logger.log(process.env.BOT_TOKEN)
    bot = new SlackBot({
        token: `${process.env.BOT_TOKEN}`,
        name: `${process.env.BOT_NAME}`
    })
}

sbConnection.attachListeners = function(){
    bot.on('start', () => {
        const params = {
            icon_emoji: ':robot_face:'
        }
        botId = bot.self.id || null;
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
        //Check if message is directed to Bot // TODO: confirm ID Later, updated as per bot
        if(data.text.indexOf(`<@${botId}>`) == 0){
            // logger.log("Message to Bot", data)
            let message = data.text.replace(`<@${botId}>`, '').trim()
            handleMessage(message, data);
        }
    })
}



function handleMessage(message, data) {
    let action = message.split('|')[0] ? message.split('|')[0].trim() : null
    let resource_name = message.split('|')[1] ? message.split('|')[1].trim() : null
    let duration = message.split('|')[2] ? message.split('|')[2].trim() : 2 // integer will be in days, defualt 2 days
    let description = message.split('|')[3] ? message.split('|')[3].trim() : ''
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
            // check if force flag is set
            let removeForcefully = resource_name.indexOf('--force') > -1;
            if(removeForcefully){
                resource_name = resource_name.split('--')[0] ? resource_name.split('--')[0].trim() : null
            }

            dbConnection.removeExistingResource(resource_name, channelId, removeForcefully)
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
        case 'help':
            runHelp(channelId)
        break;
        default:
            errorText(channelId)
        break;
    }
}


function runHelp(channelId) {
    const params = {
        // icon_emoji: ':question:'
    }

    bot.postMessage(
        channelId,
        `You can use me by typing \`<@${botId}> <command>\`.\nPlease find all the possible commands below:\n• *list*: List all the resources\n• *list available*:  List all resources which are currently available\n• *add|<name>*: Add a resource with name <name>\n• *add|<name>,<name>,<name>,...*: Add multiple resources at a time\n• *remove|<name>*: Remove the resource with name <name>\n• *claim|<name>|<duration>|<description>*:   Claim resource with name <name>| for <duration> in days| along with some description\n• *release|<name>*: Release your claim on resource with name <name>
        `,
        params
    );
}

function errorText(channelId) {
    const params = {
        icon_emoji: ''
    }

    bot.postMessage(
        channelId,
        `:question: Oops!!! I do not recognize this command. See \`<@${botId}> help\` for list of my commands`,
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
