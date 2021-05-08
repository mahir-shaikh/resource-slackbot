dbConnection = {}
module.exports = dbConnection


const mongoose = require('mongoose');
const MongoDBURL = process.env.MongoURL || "mongodb://localhost:27017/appusage-slackbot";
var RESOURCE = require('../models/ResourceModel')

const sbConnection = require('./slack-connection.js')
const logger = require('./logger')


dbConnection.connect = function(){
    logger.log(MongoDBURL)
    //Mongoose connection
    mongoose.connect(MongoDBURL, { useUnifiedTopology: true, useNewUrlParser: true, useFindAndModify: false }).then(() => {
        logger.log("MongoDB Connected Successfully");
    }).catch((err) => {
        logger.log("MongoDB Connecttion failed:", err);
    })
}

dbConnection.addNewResource = function(name){
    var resource = new RESOURCE({
        name: name
    })
    resource.save().then((info) => {
        sbConnection.sendMessageToChannel('Resource added to DB')
    }).catch((err) => {
        logger.log("addNewResource failure", err)
        sbConnection.sendMessageToChannel('Resource not added to DB')
    })
}

dbConnection.removeExistingResource = async function(name){
    try{
        let resource = await RESOURCE.findOne({name: name})
        if(resource){
            RESOURCE.findByIdAndDelete(resource._id).then(deletedResource => {
                if(deletedResource){
                    // logger.log("removeExistingResource success", deletedResource)
                    sbConnection.sendMessageToChannel(`${name} deleted succesfully`)
                }else{
                    sbConnection.sendMessageToChannel(`Unable to delete ${name}`)
                }
            }).catch((err) => {
                logger.log("removeExistingResource failure", err)
                sbConnection.sendMessageToChannel(`Unable to delete ${name}`)
            })
        }else{
            sbConnection.sendMessageToChannel(`No such resource exists: ${name}`)
        }
    }catch(e){

    }
}

dbConnection.claim = async function(name, duration, claimTime, owner, description){
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
        let resource = await RESOURCE.findOne({name: name})
        if(resource){
            if(resource.isClaimed){
                if(resource.owner == owner){
                    claimResource(resource, name, duration, claimTime, owner, description)
                }else{
                    // already being used by xyz till time...
                    let time = new Date(resource.claimTime + resource.duration)
                    sbConnection.sendMessageToChannel(`Cannot Claim the resource ${name} as it is already being used by ${resource.owner} till ${time}`)
                }
            }else{
                // claim the resource
                claimResource(resource, name, duration, claimTime, owner, description)
            }
        }else{
            sbConnection.sendMessageToChannel(`No such resource exists: ${name}`)
        }
    }catch(e){
        logger.log(e)
    }
}

dbConnection.release = async function(name, owner){
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
        let resource = await RESOURCE.findOne({name: name})
        if(resource){
            if(resource.isClaimed){
                if(resource.owner == owner){
                    releaseResource(resource)
                }else{
                    sbConnection.sendMessageToChannel(`You cannot release the resource ${name} as it is  was not claimed by you. Please ask ${resource.owner} to release`)
                }
            }else{
                sbConnection.sendMessageToChannel(`No need to release as the resource. ${name} is already free`)
            }
        }else{
            sbConnection.sendMessageToChannel(`No such resource exists: ${name}`)
        }
    }catch(e){
        logger.log(e)
    }
}

function claimResource(resource, name, duration, claimTime, owner, description){
    try{
        RESOURCE.findByIdAndUpdate(resource._id, {
            owner: owner,
            message: description,
            claimTime: claimTime,
            duration: duration,
            isClaimed: true
        }).then((updatedDocument)=>{
            sbConnection.sendMessageToChannel(`${name} has been claimed successfully by ${owner}`)
        }).catch((e)=>{
            sbConnection.sendMessageToChannel(`Some error occured while claiming ${name}`)
        })
        
    }catch(e){
        logger.log(e)
    }

}
function releaseResource(resource){
    try{
        RESOURCE.findByIdAndUpdate(resource._id, {
            owner: null,
            message: null,
            claimTime: null,
            duration: null,
            isClaimed: false
        }).then((updatedDocument)=>{
            sbConnection.sendMessageToChannel(`${updatedDocument.name} has been released successfully by ${resource.owner}`)
        }).catch((e)=>{
            sbConnection.sendMessageToChannel(`Some error occured while releasing ${resource.name}`)
        })
        
    }catch(e){
        logger.log(e)
    }

}
