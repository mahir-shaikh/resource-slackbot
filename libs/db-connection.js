dbConnection = {}
module.exports = dbConnection

const mongoose = require('mongoose');
const MongoDBURL = process.env.MongoURL || "mongodb://localhost:27017/appusage-slackbot";
var RESOURCE = require('../models/ResourceModel')

const sbConnection = require('./slack-connection.js')
const logger = require('./logger')

const CronJob = require('cron').CronJob;

dbConnection.startCron = function() {
    var job = new CronJob(
    '0 */360 * * * *', //Run every 6 hours
    function(){
        onCronTick()
    }, null, true, 'America/Los_Angeles');
    job.start();
}

async function onCronTick() {
    try {
        let allResources = await RESOURCE.find({isClaimed : true});
        let expiredResource = [];
        let currentTime = new Date().getTime();
        for (let i = 0; i < allResources.length; i++) {
            let bucket = allResources[i];
            let totalTime = bucket.claimTime + bucket.duration;
            if(currentTime >= totalTime) {
                expiredResource.push(mongoose.Types.ObjectId(bucket._id));
            }
        }
        if(expiredResource.length) {
            releaseAll(expiredResource);
        }
    } catch (error) {
        console.log(error);
    }

}
async function releaseAll(expiredResource) {
    try {
        let allResources = await RESOURCE.updateMany({'_id' : {$in : expiredResource}}, {
            owner: null,
            message: null,
            claimTime: null,
            duration: null,
            isClaimed: false
        });
        logger.log('all expired resources are availabel now');
    } catch (error) {
        logger.log(error);
    }
}

dbConnection.connect = function(){
    logger.log(MongoDBURL)
    //Mongoose connection
    db = mongoose.connect(MongoDBURL, { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false }).then(() => {
        logger.log("MongoDB Connected Successfully");
    }).catch((err) => {
        logger.log("MongoDB Connecttion failed:", err);
    })
}

dbConnection.addNewResource = async function(name, channelId){
    try {
        let resource = await RESOURCE.findOne({name: name, channelId: channelId})
        if(resource){
            sbConnection.sendMessageToChannel(channelId, 'Resource already exits')
            return;
        }

        let newresource = new RESOURCE({
            name: name,
            channelId: channelId
        })
        newresource.save().then((info) => {
            sbConnection.sendMessageToChannel(channelId, 'Resource added to DB')
        }).catch((err) => {
            logger.log("addNewResource failure"+ err)
            sbConnection.sendMessageToChannel(channelId, 'Something went wrong. Resource not added in DB')
        })        
    } catch (err) {
        logger.log("addNewResource:"+err)
    }
}

dbConnection.removeExistingResource = async function(name, channelId){
    try{
        let resource = await RESOURCE.findOne({name: name, channelId: channelId})
        if(resource){
            RESOURCE.findByIdAndDelete(resource._id).then(deletedResource => {
                if(deletedResource){
                    // logger.log("removeExistingResource success", deletedResource)
                    sbConnection.sendMessageToChannel(channelId, `${name} deleted succesfully`)
                }else{
                    sbConnection.sendMessageToChannel(channelId, `Unable to delete ${name}`)
                }
            }).catch((err) => {
                logger.log("removeExistingResource failure", err)
                sbConnection.sendMessageToChannel(channelId, `Unable to delete ${name}`)
            })
        }else{
            sbConnection.sendMessageToChannel(channelId, `No such resource exists: ${name}`)
        }
    }catch(e){

    }
}

dbConnection.claim = async function(name, duration, claimTime, owner, description, channelId){
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

    try{
        let resource = await RESOURCE.findOne({name: name, channelId: channelId})
        if(resource){
            if(resource.isClaimed){
                if(resource.owner == owner){
                    claimResource(resource, name, duration, claimTime, owner, description, channelId)
                }else{
                    // already being used by xyz till time...
                    let time = parseInt(new Date(resource.claimTime + resource.duration)/1000)
                    sbConnection.sendMessageToChannel(channelId, `Cannot Claim the resource ${name} as it is already being used by <@${resource.owner}> till <!date^${time}^{date}|Date not available :person_frowning:>`)
                }
            }else{
                // claim the resource
                claimResource(resource, name, duration, claimTime, owner, description, channelId)
            }
        }else{
            sbConnection.sendMessageToChannel(channelId, `No such resource exists: ${name}`)
        }
    }catch(e){
        logger.log(e)
    }
}

dbConnection.release = async function(name, owner, channelId){
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

    try{
        let resource = await RESOURCE.findOne({name: name, channelId: channelId})
        if(resource){
            if(resource.isClaimed){
                if(resource.owner == owner){
                    releaseResource(resource)
                }else{
                    sbConnection.sendMessageToChannel(channelId, `You cannot release the resource ${name} as it is  was not claimed by you. Please ask <@${resource.owner}> to release`)
                }
            }else{
                sbConnection.sendMessageToChannel(channelId, `No need to release as the resource. ${name} is already free`)
            }
        }else{
            sbConnection.sendMessageToChannel(channelId, `No such resource exists: ${name}`)
        }
    }catch(e){
        logger.log(e)
    }
}

dbConnection.getAllResources = function(channelId){
    RESOURCE.find({channelId: channelId}).then((resources)=>{
        let finalString = ''
        for (let i = 0; i < resources.length; i++) {
            const element = resources[i];

            finalString += '• *'+element.name +'*'
            finalString += element.isClaimed ? " - " : ' - Available'
            if(element.isClaimed){
                finalString += ' *Claimed By:* <@'+ element.owner + '>'
                finalString += ' - '+ '_' + element.message + '_'
                finalString += ' *Claimed on:* ' + '<!date^'+parseInt(element.claimTime/1000)+'^{date}|Date not available :person_frowning:>'//Need to format it as DD MM YYYY
                finalString += ' *Claimed till:* ' + '<!date^'+parseInt((element.claimTime + element.duration)/1000)+'^{date}|Date not available :person_frowning:>' //Need to format it as DD MM YYYY
            }
            
            finalString += '\n'
        }

        if(!finalString){
            finalString = "No resources present. \nPlease add using the add command. \nRun help for all commands."
        }
        sbConnection.sendMessageToChannel(channelId, finalString)
    }).catch((e) =>{
        logger.log(e)
    })
}

dbConnection.getAvailableResources = function(channelId){
    RESOURCE.find({isClaimed: false, channelId: channelId}).then((resources)=>{
        
        let simplefiedArray = resources.map((element, index)=>{
            return '• ' + element.name
        }).sort()

        sbConnection.sendMessageToChannel(channelId, '```'+simplefiedArray.join('\n')+'```')
    }).catch((e) =>{
        logger.log(e)
    })
}

function claimResource(resource, name, duration, claimTime, owner, description, channelId){
    try{
        RESOURCE.findByIdAndUpdate(resource._id, {
            owner: owner,
            message: description,
            claimTime: claimTime,
            duration: duration,
            isClaimed: true
        }).then((updatedDocument)=>{
            sbConnection.sendMessageToChannel(channelId, `*${name}* has been claimed successfully by <@${owner}>`)
        }).catch((e)=>{
            sbConnection.sendMessageToChannel(channelId, `Some error occured while claiming ${name}`)
        })
        
    }catch(e){
        logger.log(e)
    }

}
function releaseResource(resource, channelId){
    try{
        RESOURCE.findByIdAndUpdate(resource._id, {
            owner: null,
            message: null,
            claimTime: null,
            duration: null,
            isClaimed: false
        }).then((updatedDocument)=>{
            sbConnection.sendMessageToChannel(channelId, `${updatedDocument.name} has been released successfully by <@${resource.owner}>`)
        }).catch((e)=>{
            sbConnection.sendMessageToChannel(channelId, `Some error occured while releasing ${resource.name}`)
        })
        
    }catch(e){
        logger.log(e)
    }

}

dbConnection.addMultipleResource =  async function(body, channelId) { 
    let allResources = await RESOURCE.find({'name' : {$in : body}, channelId : channelId})
    if(allResources.length){
        allResources = allResources.map((resource)=>{
            return resource.name;
        })

        body = body.filter((item)=>{
            return !allResources.includes(item)
        }).map((obj)=>{
            return {
                name: obj,
                channelId: channelId
            }
        })
    }

    RESOURCE.insertMany(body).then(function(){
            let message = '';
            if(allResources.length){
                message += '*' + allResources.join(",") + '* already exists in DB and were not re-added \n'
            }
            minifiedBody = body.map((item)=> item.name)
            if(minifiedBody){
                message += '*' + minifiedBody.join(",") + '* were successfully added in DB \n'
            }
            sbConnection.sendMessageToChannel(channelId, message)
            logger.log("Data inserted")  // Success
        }).catch(function(error){
            logger.log(error)      // Failure
        });
}