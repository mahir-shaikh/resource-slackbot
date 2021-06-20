var smlConnection = {};
module.exports = smlConnection;

var sbConnection = require("./slack-connection");
var modalController = require("../controllers/modal-controller")
var commonController = require("../controllers/common-controller")


var bot;

smlConnection.attachModalCommand = function() {
  // Listen for a slash command invocation
  bot = sbConnection.bot
  // bot.command("/resourcebot", async (obj) => {
  bot.command("/resourcebot", async ({ command, ack, body, client }) => {
    // Acknowledge the command request
    await ack();
    console.log(JSON.stringify(command))
    let channelId = command.channel_id;
    // if(command.channel_name != 'directmessage'){
    //     modalController.openModal(client, body, channelId);
    // }
    
    
    
    let url = `https://slack.com/api/conversations.info?channel=${channelId}&pretty=1`
    commonController.httpGet(url, process.env.SLACK_BOT_TOKEN,(data)=>{
      if(command.channel_name != 'directmessage' && data.ok && data.channel.is_member){
        modalController.openModal(client, body, channelId);
      }else{        
        let viewObject = modalController.getView('error', {text: '*I have no power to do anything here!!!*\n\n_I only work inside groups or channels where I am present._'});
        modalController.openModal(client, body, channelId,null,null, viewObject);
        // commonController.sendEphemeralMessageToChannel({text: ' ', channelId, userId: command.user_id}); 
      } 
    })
     
  });
}

smlConnection.attachModalAction = function() {
  // Listen for a button invocation with action_id `button_abc` (assume it's inside of a modal)
  bot.action("add_option", async ({ ack, body, client }) => {
    // Acknowledge the button request
    await ack();
    
    let channelId = body.view.private_metadata // Getting the channel id as stored in previous function
    let view = modalController.getView('add', {channelId})
    // let view = modalViews.add(channelId)
    modalController.updateModal(client, body, view)
  });
  
  bot.action("claim_option", async ({ ack, body, client,}) => {
    // Acknowledge the button request
    await ack();
    modalController.onClaimOptionClick({body, client});    
  });
  
  bot.action("remove_option", async ({ ack, body, client }) => {
    // Acknowledge the button request
    await ack();
    modalController.onRemoveOptionClick({body, client});
    
  });
  
  bot.action("release_option", async ({ ack, body, client }) => {
    // Acknowledge the button request
    await ack();
    modalController.onReleaseOptionClick({body, client});
    
  });
  
  bot.action("list_option", async ({ ack, body, client }) => {
    // Acknowledge the button request
    await ack();
    modalController.onListOptionClick({body, client});    
  });
  
  
  // FROM LIST
  bot.action("list_claim", async ({ack, body, client, action}) => {
    // Acknowledge the button request
    await ack();
    
    let initialOption = action.selected_option.value;
    modalController.onClaimOptionClick({body, client, initialOption});    
  });
  
  bot.action("list_claimed_overflow", async ({ack, body, client, action}) => {
    // Acknowledge the button request
    await ack();
    
    let resource_name = action.selected_option.value;
    let channelId = body.view.private_metadata;
    
    if(resource_name.indexOf('Release_') != -1){
      resource_name = resource_name.replace('Release_','')
      modalController.onReleaseModalSubmit({body, client, resource_name, channelId});
    }else if(resource_name.indexOf('Update_') != -1){
      let initialOption = resource_name.replace('Update_','')
      modalController.onClaimOptionClick({body, client, initialOption});      
    }   
  });
  
  bot.action("add_new_option", async ({ ack, body, client }) => {
    // Acknowledge the button request
    await ack();
    let channelId = body.view.private_metadata // Getting the channel id as stored in previous function
    let view = modalController.getView('addnew', {initialView: body.view})
    // let view = modalViews.add(channelId)
    modalController.updateModal(client, body, view)
  });
};

smlConnection.attachViewActions = function() {
  // Handle a view_submission event
  bot.view("modal_add_submit", async ({ client, ack, view, body }) => {
    // Acknowledge the view_submission event
    await ack();
    modalController.onAddModalSubmit({client, view, body})
  });
  
  
  bot.view("modal_claim_submit", async ({ client, ack, view, body }) => {
    // Acknowledge the view_submission event
    await ack();
    modalController.onClaimModalSubmit({client, view, body})
  });
  
  bot.view("modal_remove_submit", async ({ client, ack, view, body }) => {
    // Acknowledge the view_submission event
    await ack();
    modalController.onRemoveModalSubmit({client, view, body})    
  });
  
  bot.view("modal_release_submit", async ({ client, ack, view, body }) => {
    // Acknowledge the view_submission event
    await ack();
    modalController.onReleaseModalSubmit({client, view, body})    
  });
  
  bot.view("modal_list_submit", async ({ client, ack, view, body }) => {
    // Acknowledge the view_submission event
    await ack();

    let channelId = view.private_metadata;
    modalController.openModal(client, body, channelId)    
  });
};

smlConnection.attachMessageAction = function() {  
  bot.action("attachment_claim", async ({ack, body, client, action}) => {
    // Acknowledge the button request
    await ack();
    
    let initialOption = action.value;
    let channelId = body.channel.id;
    let owner = body.user.id
    
    modalController.openClaimModal({client, body, initialOption, channelId, owner});    
  });
};