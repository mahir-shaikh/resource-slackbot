const SlackBot = require('slackbots');
const dotenv = require('dotenv')
dotenv.config()

const mongoose = require('mongoose');
const MongoDBURL = process.env.MongoURL || "mongodb://localhost:27017/appusage-slackbot";


//Mongoose connection
mongoose.connect(MongoDBURL, { useUnifiedTopology: true, useNewUrlParser: true }).then(() => {
    console.log("MongoDB Connected Successfully");
}).catch((err) => {
    console.log("MongoDB Connecttion failed:", err);
})

// Slack Connection
console.log(process.env.BOT_TOKEN)
const bot = new SlackBot({
    token: `${process.env.BOT_TOKEN}`,
    name: 'appdemo_legacy_bot'
})

bot.on('start', () => {
    const params = {
        icon_emoji: ':robot_face:'
    }    
})

// Error Handle
bot.on('error', (err) => {
    console.log(err);
})

// Message Handler
bot.on('message', (data) => {
    if(data.type !== 'message') {
        return;
    }
    //Check if message is directed to Bot // TODO: confirm ID Later, updated as per channel
    if(data.text.indexOf('<@U021FMX8FSQ>') == 0){
        // console.log("Message to Bot", data)
        let message = data.text.replace('<@U021FMX8FSQ>', '').trim()
        handleMessage(message, data);
    }
})

function handleMessage(message, data) {
    let action = message.split('|')[0]
    let resource_name = message.split('|')[1]
    // let duration = message.split('|')[2]
    // let owner = data.user;
    // let claimTime = new Date().now()
    switch (action) {
        case 'add':
            addNewResource(resource_name)
        break;
        case 'remove':
            removeExistingResource(resource_name)
        break;
    
        default:
            runHelp()
            break;
    }
    if(message.includes(' add')) {
        addNewResource('test')
    } else if(message.includes(' remove')) {
        removeExistingResource(name)
    }else if(message.includes(' claim')) {
        // randomJoke()
    }else if(message.includes(' release')) {
        // randomJoke()
    } else if(message.includes(' help')) {
        runHelp()
    }
}

var RESOURCE = require('./models/ResourceModel')
function addNewResource(name){
    var resource = new RESOURCE({
        name: name
    })
    resource.save().then((info) => {
        sendMessageToChannel('Resource added to DB')
    }).catch((err) => {
        console.log("addNewResource failure", err)
        sendMessageToChannel('Resource not added to DB')
    })
}

async function removeExistingResource(name){
    let resource = await RESOURCE.findOne({name: name})
    if(resource){
        RESOURCE.findByIdAndDelete(resource._id).then(deletedResource => {
            if(deletedResource){
                // console.log("removeExistingResource success", deletedResource)
                sendMessageToChannel(`${name} deleted succesfully`)
            }else{
                sendMessageToChannel(`Unable to delete ${name}`)
            }
        }).catch((err) => {
            console.log("removeExistingResource failure", err)
            sendMessageToChannel(`Unable to delete ${name}`)
        })
    }else{
        sendMessageToChannel(`No such resource exists: ${name}`)
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

function sendMessageToChannel(message, params = {}) {
    bot.postMessageToChannel(
        'test1',
        `${message}`,
        params
    );
}