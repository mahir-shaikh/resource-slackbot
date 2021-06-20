var commonController = {};
module.exports = commonController;

const request = require('request');
const logger = require("../libs/logger");
const dbConnect = require("../libs/db-connect");
const sbConnection = require('../libs/slack-connection');
var emojis = require("../models/emojis");
var bot;

function initialize(Id){
  // Listen for a slash command invocation
  bot = sbConnection.bot
}
commonController.initialize = initialize

async function sendMessageToChannel( channelId, text, image ){
  if(bot == undefined){
    commonController.initialize()
  }
  
  try {
    // Call the chat.postMessage method using the built-in WebClient
    let blocks = [
      {
        type: "divider"
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: text
        }
      },
      {
        type: "divider"
      }
    ];
    
    // Commenting this as we do not need to attach image in messages as it is too distracting
    // if(image){
    //   blocks[1].accessory = {
    //     "type": "image",
    //     "image_url": image,
    //     "alt_text": "alt text for image"
    //   }
    // }
    const result = await bot.client.chat.postMessage({
      // The token you used to initialize your app
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
      // blocks: blocks
      
      // Sending simple message to keep it simple and show it in notifications as blocks are not displayed in notifications
      text: text 
    });

    // Print result, which includes information about the message (like TS)
    // logger.log(result);
  } catch (error) {
    logger.log(error);
  }
}
commonController.sendMessageToChannel = sendMessageToChannel;

async function sendEphemeralMessageToChannel( {channelId, text, image, userId, viewObject }){
  if(bot == undefined){
    commonController.initialize()
  }
  
  try {
    // Call the chat.postMessage method using the built-in WebClient
    let blocks;
    if(viewObject){
      blocks = viewObject
    }else{
      blocks = {
        blocks: [
            {
              type: "divider"
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: text
              }
            },
            {
              type: "divider"
            }
          ]
       };
    }
    
    // Commenting this as we do not need to attach image in messages as it is too distracting
    // if(image){
    //   blocks.blocks[1].accessory = {
    //     "type": "image",
    //     "image_url": image,
    //     "alt_text": "alt text for image"
    //   }
    // }
    
    let finalObject = {
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
      user: userId,
      ...blocks
      // You could also use a blocks[] array to send richer content
    }
    
    console.log(JSON.stringify(finalObject))
    
   return bot.client.chat.postEphemeral(finalObject);
  } catch (error) {
    logger.log(error);
  }
}
commonController.sendEphemeralMessageToChannel = sendEphemeralMessageToChannel;

commonController.addNewResource = function({name, channelId, owner}){
   return new Promise(async (resolve, reject) => {
    try {
      let msg;
      let image;
      let resource = await dbConnect.findOne({ name, channelId });
      if (resource) {
        msg = `*${name}* already exists in the database!!!`;
        image = emojis.facepalm;
        reject({msg, image});
        return;
      }

      dbConnect.addNewResource({ name, channelId }).then(info => {
          msg = `*${name}* added to the database by <@${owner}>`;
          image = emojis.awwyeah
          resolve({msg, image});
        }).catch(err => {
          msg = `Something went wrong. *${name}* was not added in the database`;
          image = emojis.confuseddog;
          logger.log("addNewResource failure", err);
          reject({msg, image});
        });
    } catch (err) {
      logger.log("addNewResource:", err);
    }
  });
}

commonController.claimResource = async function({name, duration, claimTime, owner, message, channelId }) {
  /*
    resource exist? - true
        isClaimed ? true
            Claimed by me? owner?
                allow - update
            Not claimed by be ? error 
                already being used by xyz till time...
        isClaimed? false
            claim the resource - update the mongo db
    resource exist? - false
        error message
    */

  return new Promise(async (resolve, reject) => {
    try {
      let resource = await dbConnect.findOne({ name, channelId });
      if (resource) {
        if (resource.isClaimed) {
          if (resource.owner == owner) {
            console.log('before calling claim')
            return claim( {resource, name, duration, claimTime, owner, message, channelId }).then((obj)=>{
              resolve(obj)
            }).catch((obj)=>{
              reject(obj)
            })
          } else {
            // already being used by xyz till time...
            // let time = parseInt(new Date(resource.claimTime + resource.duration)/1000)
            let time = resource.claimTime + resource.duration;
            let msg = `Cannot claim the resource *${name}* as it is already being used by <@${resource.owner}> till ${getSlackTimeString(time)}`;
            let image = emojis.letmein;
            reject({ msg, image });
          }
        } else {
          // claim the resource
          console.log('before calling claim')
          return claim( {resource, name, duration, claimTime, owner, message, channelId }).then((obj)=>{
            resolve(obj)
          }).catch((obj)=>{
            reject(obj)
          })
        }
      } else {
        let msg = `No such resource exists: *${name}*`;
        let image = emojis.kekw;
        reject({ msg, image });
      }
    } catch (e) {
      logger.log(e);
    }
  });
}
function claim({resource, name, duration, claimTime, owner, message, channelId}) {
  return new Promise((resolve, reject) => {
    try {
      dbConnect.updateResource(resource._id, {owner, message, claimTime, duration, isClaimed: true, notificationSent: false }).then(updatedDocument => {
          let msg = `*${name}* has been claimed successfully by <@${owner}>`;
          let image = emojis.catjam;
          console.log('inside then of dbConnect.updateResource')
          resolve({ msg, image });
        }).catch(e => {
          let msg = `Some error occured while claiming *${name}*`;
          let image = emojis.ohno;
          console.log('inside then of dbConnect.updateResource')
          reject({ msg, image });
        });
    } catch (e) {
      logger.log(e);
    }
  });
}


commonController.removeExistingResource = function({name, channelId ,owner, removeForcefully}){
 return new Promise(async (resolve, reject) => {
    try {
      let resource = await await dbConnect.findOne({ name, channelId });
      if (resource) {
        if (resource.isClaimed) {
          if (removeForcefully) {
            // remove resource from DB
            return removeResource({resource, owner}).then((obj)=>{
              resolve(obj)
            }).catch((obj)=>{
              reject(obj)
            })
          } else {
            let msg = `You cannot remove a resource which is being used (is claimed by someone). \n Please ask <@${resource.owner}> to release *${name}* in order to proceed.`;
            let image = emojis.thinkaboutit;
            reject({ msg, image });
          }
        } else {
          // remove resource from DB
          return removeResource({resource, owner}).then((obj)=>{
            resolve(obj)
          }).catch((obj)=>{
            reject(obj)
          })
        }
      } else {
        let msg = `No such resource exists: *${name}*`;
        let image = emojis.wtf;
        reject({ msg, image });
      }
    } catch (e) {
      logger.log(e);
    }
  });  
}
function removeResource({resource, owner}) {
  return new Promise((resolve, reject) => {
    try {
      dbConnect.removeExistingResource(resource._id)
        .then(deletedResource => {
          if (deletedResource) {
            // logger.log("removeExistingResource success", deletedResource)
            let msg = `*${resource.name}* deleted succesfully by <@${owner}>`;
            let image = emojis.success;
            resolve({ msg, image });
          } else {
            let msg = `Unable to delete *${resource.name}*`;
            let image = emojis.ahhhhh;
            reject({ msg, image });
          }
        })
        .catch(err => {
          logger.log("removeExistingResource failure", err);
          let msg = `Unable to delete *${resource.name}*`;
          let image = emojis.ohno;
          reject({ msg, image });
        });
    } catch (e) {
      logger.log(e);
    }
  });
}


commonController.releaseResource = function({name, owner, channelId}) {
  /*
    resource exist? - true
        isClaimed ? true
            Claimed by me? owner?
                allow - release
            Not claimed by be ? error 
                you do not have have enough rights to release this
        isClaimed? false
            no need to release chutiye
    resource exist? - false
        error message
    */

  return new Promise(async (resolve, reject) => {
    try {
      let resource = await dbConnect.findOne({ name, channelId });
      if (resource) {
        if (resource.isClaimed) {
          if (resource.owner == owner) {
            return release(resource, channelId).then((obj)=>{
              resolve(obj)
            }).catch((obj)=>{
              reject(obj)
            })
          } else {
            let msg = `You cannot release *${name}* as it was not claimed by you.\n Please ask <@${resource.owner}> to release`
            let image = emojis.excuseme
            reject({msg, image})
          }
        } else {
          let msg = `No need to release as *${name}* is already available`
          let image = emojis.facepalm
          reject({msg, image})
        }
      } else {
        let msg = `No such resource exists: *${name}*`
        let image = emojis.wtf
        reject({msg, image})
      }
    } catch (e) {
      logger.log(e);
    }
  });
};
function release(resource) {
  return new Promise((resolve, reject)=>{
    try {
       dbConnect.updateResource(resource._id, {
        owner: null,
        message: null,
        claimTime: null,
        duration: null,
        isClaimed: false,
        notificationSent: false
      }).then(updatedDocument => {
        let msg = `*${updatedDocument.name}* has been released successfully by <@${resource.owner}>`
        let image = emojis.trumpdance
        resolve({msg, image})
      })
      .catch(e => {
        let msg = `Some error occured while releasing ${resource.name}`
        let image = emojis.ohno
        reject({msg, image})
      });
    } catch (e) {
      logger.log(e);
    }
  });  
}


commonController.addMultipleResource = function({body, channelId, owner}) {
  return new Promise(async (resolve, reject)=>{
    let allResources = await dbConnect.findMany({
      name: { $in: body },
      channelId
    });

    if (allResources.length) {
      allResources = allResources.map(resource => {
        return resource.name;
      });

      body = body.filter(item => {
        return !allResources.includes(item);
      });
    }
    // Filter out duplicate values
    body = body.filter((elem, index, array) => {
      return array.indexOf(elem) === index;
    });
    // Create required format to push in Mongo
    body = body.map(obj => {
      return {
        name: obj,
        channelId: channelId
      };
    });

    dbConnect.addMultipleResource(body)
      .then(function() {
        let msg = "";
        let image = "";
        if (allResources.length) {
          let grammerTense = allResources.length == 1 ? 'was' : 'were'
          msg += "*" + allResources.join(",") + `* already exists in the database and ${grammerTense} not re-added. \n`;
        }
        let minifiedBody = body.map(item => item.name);
        if (minifiedBody.length) {
          let grammerTense = minifiedBody.length == 1 ? 'was' : 'were'
          msg += "*" + minifiedBody.join(",") + `* ${grammerTense} successfully added in the database by <@${owner}>\n`;
          image = emojis.awwyeah
          resolve({msg, image})
        }else{
          image = emojis.confuseddog;
          reject({msg, image})
        }
       
        logger.log("Data inserted"); // Success
      })
      .catch(function(error) {
        logger.log("Inside addMultipleResource catch:",error); // Failure
      });
  })  
};

function getSlackTimeString(time) {
  // time in milliseconds
  time = Math.floor(time / 1000);
  return `<!date^${time}^{date_num} at {time}|->`;
}
commonController.getSlackTimeString = getSlackTimeString


commonController.deleteAllResourcesBelongingToChannel = function(channelId) {
  console.log('commonController.deleteAllResourcesBelongingToChannel')
  dbConnect.deleteAllResourceBelongingToChannel( channelId )
    .then(deletedResources => {
      logger.log(JSON.stringify(deletedResources), "removed as the channel does not exists anymore");
    })
    .catch(e => {
      logger.log(e);
    });
};

commonController.welcomeUser =function ({channelId, userId, botId}){
  let text = `
    Hello <@${userId}>!!!\nWelcome to the Channel. I am Resource Bot which helps you keep a track of resources.
    
    :question: You can use me by typing \`<@${botId}> <command>\`.
    Please find all the possible commands below:
    • *list*: List all the resources
    • *list available*:  List all resources which are currently available
    • *add|<name>*: Add a resource with name <name>
    • *add|<name>,<name>,<name>,...*: Add multiple resources at a time
    • *remove|<name>*: Remove the resource with name <name>
    • *claim|<name>|<duration>|<description>*:   Claim resource with name <name>| for <duration> in days| along with some description
    • *release|<name>*: Release your claim on resource with name <name>
    
    I also provide dialog box functionality. You can use that using \`/resourcebot\`
  `
  let image = emojis.welcome
  sendEphemeralMessageToChannel( {channelId, text, image, userId })
}

commonController.httpGet = function(url,token, cb){
  request({
    url,
    headers: {
      'Authorization': 'Bearer '+token
    },
    json: true
  }, (err, res, body) => {
    if (err) { return console.log(err); }
    cb(body)
  });
}


//   let text = `
//     Hello <@${userId}>!!!\nWelcome to the Channel. I am Resource Bot which helps you keep a track of resources.
    
//     :question: You can use me by typing \`<@${botId}> <command>\`.
//     Please find all the possible commands below:
//     • *list*: List all the resources
//     • *list available*:  List all resources which are currently available
//     • *add|<name>*: Add a resource with name <name>
//     • *add|<name>,<name>,<name>,...*: Add multiple resources at a time
//     • *remove|<name>*: Remove the resource with name <name>
//     • *claim|<name>|<duration>|<description>*:   Claim resource with name <name>| for <duration> in days| along with some description
//     • *release|<name>*: Release your claim on resource with name <name>
    
//     :question: You can also use me by typing \`/<command>\`.
//     Please find all the possible commands below:
//     • */list*: List all the resources
//     • */list-available*:  List all resources which are currently available
//     • */add <name>*: Add a resource with name <name>
//     • */add <name>,<name>,<name>,...*: Add multiple resources at a time
//     • */remove <name>*: Remove the resource with name <name>
//     • */claim <name>|<duration>|<description>*:   Claim resource with name <name>| for <duration> in days| along with some description
//     • */release <name>*: Release your claim on resource with name <name> 
    
//     I also provide dialog box functionality. You can use that using \`/resourcebot\`
//   `