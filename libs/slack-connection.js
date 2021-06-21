var sbConnection = {};
module.exports = sbConnection;

const { App } = require("@slack/bolt");

const logger = require("./logger");
var messageController = require('../controllers/message-controller')
var commonController = require('../controllers/common-controller')

var bot;
var botId;

sbConnection.createBot = function() {
  // Slack Connection
  bot = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
  });
  
  // botId = "U021XGY7X9B"; // TODO: Get Bot Id dynamycally
  
    // Start your app
  return bot.start(process.env.PORT || 3000)
    
};

function setBot() {
  sbConnection.bot = bot;
  sbConnection.botId = botId;
}
sbConnection.setBot = setBot 

sbConnection.attachListeners = function() {
  bot.event("group_deleted", async ({ event, client, context }) => {
    console.log('inside group_deleted')
    let channelId = event.channel;
    console.log('CHANNEL ID in GROUP DELETED', channelId)
    commonController.deleteAllResourcesBelongingToChannel(channelId);
  });
  
  bot.event("member_joined_channel", async ({ event, client, context }) => {
    botId = context.botUserId
    let channelId = event.channel;
    let userId = event.user;
    commonController.welcomeUser({channelId, userId, botId})
  });
  
  
  bot.event("channel_deleted", async ({ event, client, context }) => {
    console.log('inside channel_deleted')
    let channelId = event.channel;
    commonController.deleteAllResourcesBelongingToChannel(channelId);
  });
  

  bot.event("app_mention", async ({ event, client, context }) => {  
    botId = context.botUserId
    let message = event.text.replace(`<@${botId}>`, "").trim();
    //Check if message was sent by BOT to avoid infinite loop
    let userId = event.user;
    console.log(JSON.stringify(event))
    if(userId && userId != botId){
      messageController.handleMessage(message, event, botId);
    }
  });
};

sbConnection.attachMessageAction = function() {  
  bot.action("attachment_release", async ({ack, body, action}) => {
    // Acknowledge the button request
    await ack();
    
    let resource_name = action.value;
    let channelId = body.channel.id;
    let owner = body.user.id
    
    messageController.releseResource({name: resource_name, channelId ,owner})
  });
};