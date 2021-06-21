var messageController = {};
module.exports = messageController;

const commonController = require("./common-controller")
const dbConnect = require("../libs/db-connect");
const logger = require("../libs/logger");
var emojis = require("../models/emojis");
const sbConnection = require('../libs/slack-connection')


var bot;

function initialize(id) {
  // Listen for a slash command invocation
  bot = sbConnection.bot
}
messageController.initialize = initialize

messageController.handleMessage = function(message, data, botId) {
  // console.log('inside handleMessage', message, data, botId)
  if(bot == undefined){
    initialize()
  }
  let action = message.split("|")[0] ? message.split("|")[0].trim() : null;
  let resource_name = message.split("|")[1] ? message.split("|")[1].trim().replace(/\*/g, "") : null;
  let duration = message.split("|")[2] ? message.split("|")[2].trim() : 2; // integer will be in days, defualt 2 days
  let description = message.split("|")[3] ? message.split("|")[3].trim() : "";
  let owner = data.user;
  let claimTime = new Date().getTime();
  let channelId = data.channel;
  switch (action) {
    case "add":
      if (resource_name && resource_name.split(",").length > 1) {
        addMultipleResource({resources: resource_name.split(","), channelId, owner});
      } else {
        addNewResource({name:resource_name, channelId, owner});
      }
      break;
    case "remove":
      // check if force flag is set
      let removeForcefully = resource_name.indexOf("--force") > -1;
      if (removeForcefully) {
        resource_name = resource_name.split("--")[0]
          ? resource_name.split("--")[0].trim()
          : null;
      }
      removeExistingResource({name:resource_name, channelId, removeForcefully, owner});
      break;
    case "claim":
      let durationInMilliSeconds = Number(duration) * 24 * 60 * 60 * 1000;
      // let durationInMilliSeconds = parseInt(duration)*60*1000; // Store as minute for testing purpose
      claimResource({name: resource_name, duration: durationInMilliSeconds, claimTime, owner, message: description, channelId });
      break;
    case "release":
      releseResource({name: resource_name, owner, channelId});
      break;
    case "list":
      console.log('about to handle list message')
      getAllResources({channelId});
      break;
    case "list available":
      getAvailableResources({channelId});
      break;
    case "help":
      console.log('about to handle help message')
      runHelp(channelId,false, botId);
      break;
    default:
      errorText(channelId, botId);
      break;
  }
}


function addNewResource({name, channelId, owner}){
  commonController.addNewResource({name, channelId, owner}).then(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
  }).catch(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
  }) 
}
messageController.addNewResource = addNewResource

function claimResource({ name, duration, claimTime, owner, message, channelId}){
  commonController.claimResource({ name, duration, claimTime, owner, message, channelId}).then(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
  }).catch(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
  }) 
}
messageController.claimResource = claimResource

function removeExistingResource ({name, channelId ,owner, removeForcefully}) {
   commonController.removeExistingResource({name, channelId ,owner, removeForcefully}).then(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
  }).catch(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
  }) 
}
messageController.removeExistingResource = removeExistingResource

function releseResource ({name, channelId ,owner}) {
   commonController.releaseResource({name, channelId ,owner}).then(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
  }).catch(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
  }) 
}
messageController.releseResource = releseResource

function getAllResources({channelId}) {
  dbConnect.getAllResources(channelId)
    .then(resources => {
      let finalString = "";
      for (let i = 0; i < resources.length; i++) {
        const element = resources[i];

        finalString += "• *" + element.name + "*";
        finalString += element.isClaimed ? " - " : " - Available";
        if (element.isClaimed) {
          finalString += " *Claimed By:* <@" + element.owner + ">";
          finalString += " - " + "_" + element.message + "_";
          finalString +=
            " *Claimed on:* " + commonController.getSlackTimeString(element.claimTime); //Need to format it as DD MM YYYY
          finalString +=
            " *Claimed till:* " + commonController.getSlackTimeString(element.claimTime + element.duration); //Need to format it as DD MM YYYY
          // finalString += ' *Claimed on:* ' + '<!date^'+parseInt(element.claimTime/1000)+'^{date}|Date not available :person_frowning:>'//Need to format it as DD MM YYYY
          // finalString += ' *Claimed till:* ' + '<!date^'+parseInt((element.claimTime + element.duration)/1000)+'^{date}|Date not available :person_frowning:>' //Need to format it as DD MM YYYY
        }

        finalString += "\n";
      }

      if (!finalString) {
        finalString =
          "No resources present in the database. \nPlease create new resource using the `add` command. \nRun `help` to get a list of all the commands.";
      }
      commonController.sendMessageToChannel(channelId, finalString);
    })
    .catch(e => {
      logger.log(e);
    });
};
messageController.getAllResources = getAllResources


function getAvailableResources({channelId}) {
  dbConnect.getAvailableResources(channelId)
    .then(resources => {
      let simplefiedArray = resources
        .map((element, index) => {
          return "• " + element.name;
        })
        .sort();

      if (simplefiedArray.length) {
        commonController.sendMessageToChannel(
          channelId,
          "Please find available resources below: \n" +
            simplefiedArray.join("\n")
        );
      } else {
        commonController.sendMessageToChannel(
          channelId,
          `No resources are available.`
        );
      }
    })
    .catch(e => {
      logger.log(e);
    });
};
messageController.getAvailableResources = getAvailableResources

function addMultipleResource({resources, channelId, owner}){
  commonController.addMultipleResource({body: resources, channelId, owner}).then(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
  }).catch(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
  }) 
}
messageController.addMultipleResource = addMultipleResource

function runHelp(channelId, usingCommand = false, botId) {
  const params = {
    // icon_emoji: ':question:'
  };
  let message;
  if (usingCommand) {
    message = `:question: You can use me by typing \`/<command>\`.\nPlease find all the possible commands below:\n• */list*: List all the resources\n• */list-available*:  List all resources which are currently available\n• */add <name>*: Add a resource with name <name>\n• */add <name>,<name>,<name>,...*: Add multiple resources at a time\n• */remove <name>*: Remove the resource with name <name>\n• */claim <name>|<duration>|<description>*:   Claim resource with name <name>| for <duration> in days| along with some description\n• */release <name>*: Release your claim on resource with name <name>\n\nI also provide dialog box functionality. You can use that using \`/appdemousagebot\``;
  } else {
    message = `:question: You can use me by typing \`<@${botId}> <command>\`.\nPlease find all the possible commands below:\n• *list*: List all the resources\n• *list available*:  List all resources which are currently available\n• *add|<name>*: Add a resource with name <name>\n• *add|<name>,<name>,<name>,...*: Add multiple resources at a time\n• *remove|<name>*: Remove the resource with name <name>\n• *claim|<name>|<duration>|<description>*:   Claim resource with name <name>| for <duration> in days| along with some description\n• *release|<name>*: Release your claim on resource with name <name>\n\nI also provide dialog box functionality. You can use that using \`/appdemousagebot\``;
  }
  commonController.sendMessageToChannel(channelId, message);
}
messageController.runHelp = runHelp

function errorText(channelId, botId) {
  const params = {
    icon_emoji: ""
  };

  let message = `Oops!!! I do not recognize this command. \nSee \`<@${botId}> help\` for list of my commands`;
  commonController.sendMessageToChannel(channelId, message);
}
