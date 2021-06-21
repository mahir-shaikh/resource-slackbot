var modalController = {};
module.exports = modalController;

const commonController = require('./common-controller')
const dbConnect = require("../libs/db-connect");
const logger = require("../libs/logger");
var emojis = require("../models/emojis");
var modalViews = require('../models/slackmodal-views')

modalController.onClaimOptionClick = ({body, client, initialOption})=> {
  let channelId = body.view.private_metadata // Getting the channel id as stored in previous function
  let owner = body.user.id
  dbConnect.getAvailableResources(channelId).then((resources)=>{
    dbConnect.getMyClaimedResources(channelId, owner).then((myResources)=>{
      let listOfAvailableOptions;
      let listOfMyOptions;
      if(resources.length || myResources.length){
        listOfAvailableOptions = resources.map((element, index)=>{
            return element.name
        }).sort()
        
        listOfMyOptions = myResources.map((element, index)=>{
            return element.name
        }).sort()
        
        let view = modalViews.claim({channelId, listOfAvailableOptions, listOfMyOptions, initialOption})
        updateModal(client, body, view)

      }else{
        let message = "*No resources are available to claim!!!*"
        let view = modalViews.allCommands(channelId, message, emojis.panik)
        updateModal(client, body, view)
      }     
    })
    
  });
}

modalController.onRemoveOptionClick = ({body, client})=> {
   let channelId = body.view.private_metadata // Getting the channel id as stored in previous function
    dbConnect.getAvailableResources(channelId).then((resources)=>{
      let listOfOptions;
      if(resources.length){
        listOfOptions = resources.map((element, index)=>{
            return element.name
        }).sort()
        let view = modalViews.remove(channelId, listOfOptions)
        updateModal(client, body, view)
        
      }else{
        let message = "*No resources are available to remove.*"
        let view = modalViews.allCommands(channelId, message, emojis.panik)
        updateModal(client, body, view)
      }     
    });
}

modalController.onReleaseOptionClick = ({body, client})=> {
    let channelId = body.view.private_metadata // Getting the channel id as stored in previous function
    let owner = body.user.id
    dbConnect.getMyClaimedResources(channelId, owner).then((resources)=>{
      let listOfOptions;
      if(resources.length){
        listOfOptions = resources.map((element, index)=>{
            return element.name
        }).sort()
        let view = modalViews.release(channelId, listOfOptions)
        updateModal(client, body, view)
      }else{
        let message = "*No resources were claimed by you, so you cannot release any.*"
        let view = modalViews.allCommands(channelId, message, emojis.thinkaboutit)
        updateModal(client, body, view)
      }     
    });
}

modalController.onListOptionClick = ({body, client})=> {
    let channelId = body.view.private_metadata // Getting the channel id as stored in previous function
    let owner = body.user.id
    dbConnect.getAllResources(channelId).then((resources)=>{
      let listOfAvailableOptions;
      let listOfClaimedOptions;
      
      if(resources.length){
        listOfAvailableOptions = resources.filter((obj)=>{
          return !obj.isClaimed
        }).map((element, index)=>{
            return element.name
        }).sort()
        
        listOfClaimedOptions = resources.filter((obj)=>{
          return obj.isClaimed
        })
           
        
        let view = modalViews.list(channelId, listOfAvailableOptions, listOfClaimedOptions, owner)
        updateModal(client, body, view)
      }else{
        let message = "*No resources have been added yet.*"
        let view = modalViews.allCommands(channelId, message, emojis.thinkaboutit)
        updateModal(client, body, view)
      }     
    });
}

modalController.getView = (type, {channelId, initialView, text, image}) => {
  let view;
  switch(type){
    case 'add':
      view = modalViews.add(channelId)
      break;
    case 'addnew':
      view = modalViews.addNew(initialView)
      break;
    case 'error':
      view = modalViews.error(text, image)
      break;
  }
  
  return view;
}

modalController.onAddModalSubmit = async ({client, view, body }) => {
  let channelId = view.private_metadata;
  let owner = body.user.id
  
  if(Object.keys(view.state.values).length > 1){
    //Multiple Resource
    let data = view.state.values;
    let resources = []
    for (const key in data) {
        const element = data[key];
        let newKey = key.replace('_block','_resourceName')
        if(element[newKey].value && element[newKey].value.trim()){
          resources.push(element[newKey].value)
        }
    }
    commonController.addMultipleResource({body:resources, channelId, owner}).then(({msg, image})=>{
      commonController.sendMessageToChannel(channelId, msg, image);
      openModal(client, body, channelId, msg, image)
    }).catch(({msg, image})=>{
      openModal(client, body, channelId, msg, image)
    })
  }else{
    // Single Resource
    let name = view.state.values['view_add_block-0']['view_add_resourceName-0'].value;
    
    commonController.addNewResource({name, channelId, owner}).then(({msg, image})=>{
      commonController.sendMessageToChannel(channelId, msg, image);
      openModal(client, body, channelId, msg, image)
    }).catch(({msg, image})=>{
      openModal(client, body, channelId, msg, image)
    })
  }
  
}

modalController.onClaimModalSubmit = async ({client, view, body }) => {
  // Assume there's an input block with `view_add_block` as the block_id and `view_add_resourceName`
  // const user = body["user"]["id"];
  let values = view.state.values
  let name = values.block_claim_resourceName.claim_resourceName.selected_option.value;
  let duration = values.block_claim_duration.claim_duration.value
  let message = values.block_claim_description.claim_description.value
  let channelId = view.private_metadata;
  let owner = body.user.id
  let claimTime = new Date().getTime();

  if(isNaN(duration) || duration <= 0 ){
    duration = 2 
  }else if(duration > 120){
    duration = 120
  }

  duration = Number(duration) * 24 * 60 * 60 * 1000; // converting into milliseconds
  
  commonController.claimResource({name, duration, claimTime, owner, message, channelId}).then(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
    openModal(client, body, channelId, msg, image)
  }).catch(({msg, image})=>{
    openModal(client, body, channelId, msg, image)
  })  
}

modalController.onRemoveModalSubmit = async ({client, view, body }) => {
  let values = view.state.values
  let name = values.block_remove_resourceName.remove_resourceName.selected_option.value;
  let channelId = view.private_metadata;
  let owner = body.user.id

  commonController.removeExistingResource({name, channelId ,owner, removeForcefully:false}).then(({msg, image})=>{
    commonController.sendMessageToChannel(channelId, msg, image);
    openModal(client, body, channelId, msg, image)
  }).catch(({msg, image})=>{
    openModal(client, body, channelId, msg, image)
  })  
}

modalController.onReleaseModalSubmit = async ({client, view, body, resource_name, channelId }) => {
  let name = resource_name || view.state.values.block_release_resourceName.release_resourceName.selected_option.value;
  channelId = channelId || view.private_metadata;
  let owner = body.user.id;
  
  commonController.releaseResource({name, owner, channelId}).then(({msg, image})=>{
    commonController.sendMessageToChannel(channelId,msg, image);
    if(view){
      openModal(client, body, channelId, msg, image)
    }else{
      let view = modalViews.allCommands(channelId, msg, image)
      updateModal(client, body, view)
    }
  }).catch(({msg, image})=>{
    if(view){
      openModal(client, body, channelId, msg, image)
    }else{
      let view = modalViews.allCommands(channelId, msg, image)
      updateModal(client, body, view)
    }
  })
}

modalController.openClaimModal = ({client, body, initialOption, channelId, owner})=> {
  dbConnect.getAvailableResources(channelId).then((resources)=>{
    dbConnect.getMyClaimedResources(channelId, owner).then((myResources)=>{
      let listOfAvailableOptions;
      let listOfMyOptions;
      if(resources.length || myResources.length){
        listOfAvailableOptions = resources.map((element, index)=>{
            return element.name
        }).sort()
        
        listOfMyOptions = myResources.map((element, index)=>{
            return element.name
        }).sort()
        
        let view = modalViews.claim({channelId, listOfAvailableOptions, listOfMyOptions, initialOption})
        openModal(client, body, channelId, null, null, view)
      }else{
        let message = "*No resources are available to claim!!!*"
        let view = modalViews.allCommands(channelId, message, emojis.panik)
        openModal(client, body, channelId, null, null, view)
      }     
    })
    
  });
}

async function openModal(client, body, channelId, message = null, image = null, viewObject) {
  let view = modalViews.allCommands(channelId, message, image)
  if(viewObject){
    view = viewObject;
  }
  try {
    // Call views.open with the built-in client
    const result = await client.views.open({
      // Pass a valid trigger_id within 3 seconds of receiving it
      trigger_id: body.trigger_id,
      // View payload
      view: view
    });
  } catch (error) {
    console.error(error);
  }
}
modalController.openModal = openModal;

async function updateModal(client, body, view){
  try {
    // Call views.update with the built-in client
    const result = await client.views.update({
      // Pass the view_id
      view_id: body.view.id,
      // Pass the current hash to avoid race conditions
      hash: body.view.hash,
      // View payload with updated blocks
      view: view
    });
  }
  catch (error) {
    console.error(error);
  }
}
modalController.updateModal = updateModal;