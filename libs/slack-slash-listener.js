var sslConnection = {};
module.exports = sslConnection;

var sbConnection = require("./slack-connection");
var messageController = require("../controllers/message-controller")

var bot;

sslConnection.attachSlashListener = function() {
  // GET BOT
  bot = sbConnection.bot
  // Listen for a slash command invocation
  bot.command("/add", async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();

    let resource_name = command.text;
    let channelId = command.channel_id;
    let owner = command.user_id;

    if (resource_name && resource_name.split(",").length > 1) {
      messageController.addMultipleResource({resources: resource_name.split(","), channelId, owner});
    } else {
      messageController.addNewResource({name: resource_name, channelId, owner});
    }
  });

  bot.command("/delete", async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();

    let message = command.text;
    let resource_name = message.split("|")[0]
      ? message
          .split("|")[0]
          .trim()
          .replace(/\*/g, "")
      : null;
    let channelId = command.channel_id;
    let owner = command.user_id;

    // check if force flag is set
    let removeForcefully = resource_name.indexOf("--force") > -1;
    if (removeForcefully) {
      resource_name = resource_name.split("--")[0]
        ? resource_name.split("--")[0].trim()
        : null;
    }

    messageController.removeExistingResource ({name: resource_name, channelId ,owner, removeForcefully}) 
  });

  bot.command("/claim", async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();
    let message = command.text;
    let resource_name = message.split("|")[0]
      ? message
          .split("|")[0]
          .trim()
          .replace(/\*/g, "")
      : null;
    let channelId = command.channel_id;
    let duration = message.split("|")[1] ? message.split("|")[1].trim() : 2; // integer will be in days, defualt 2 days
    let description = message.split("|")[2] ? message.split("|")[2].trim() : "";
    let owner = command.user_id;
    let claimTime = new Date().getTime();

    let durationInMilliSeconds = Number(duration) * 24 * 60 * 60 * 1000;
    // let durationInMilliSeconds = parseInt(duration)*60*1000; // Store as minute for testing purpose
   messageController.claimResource({ name: resource_name, duration: durationInMilliSeconds, claimTime, owner, message:description, channelId})
  });

  bot.command("/release", async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();
    let message = command.text;
    let resource_name = message.split("|")[0]
      ? message
          .split("|")[0]
          .trim()
          .replace(/\*/g, "")
      : null;
    let channelId = command.channel_id;
    let owner = command.user_id;

    messageController.releseResource ({name: resource_name, channelId ,owner})
  });

  bot.command("/list", async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();
    let channelId = command.channel_id;
    messageController.getAllResources({channelId})
  });

  bot.command("/list-available", async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();
    let channelId = command.channel_id;
    messageController.getAvailableResources({channelId})
  });

  bot.command("/help", async ({ command, ack, say }) => {
    // Acknowledge command request
    await ack();
    let channelId = command.channel_id;
    messageController.runHelp(channelId, true);
  });
};
