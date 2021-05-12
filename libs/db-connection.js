dbConnection = {}
module.exports = dbConnection

const mongoose = require('mongoose');
const MongoDBURL = process.env.MongoURL;
var RESOURCE = require('../models/ResourceModel')

const sbConnection = require('./slack-connection.js')
const logger = require('./logger')

const CronJob = require('cron').CronJob;

dbConnection.startCron = function() {
    var job = new CronJob(
    '0 */60 * * * *', //Run every hour
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
            sbConnection.sendMessageToChannel(channelId, `*${name}* already exists in the database!!! :facepalm:`)
            return;
        }

        let newresource = new RESOURCE({
            name: name,
            channelId: channelId
        })
        newresource.save().then((info) => {
            sbConnection.sendMessageToChannel(channelId, `*${name}* added to the database :aaw_yeah:`)
        }).catch((err) => {
            logger.log("addNewResource failure"+ err)
            sbConnection.sendMessageToChannel(channelId, `Something went wrong. *${name}* was not added in the database :confused_dog:`)
        })        
    } catch (err) {
        logger.log("addNewResource:"+err)
    }
}

dbConnection.removeExistingResource = async function(name, channelId, removeForcefully = false){
    try{
        let resource = await RESOURCE.findOne({name: name, channelId: channelId})
        if(resource){
            if(resource.isClaimed){
                if(removeForcefully){
                    // remove resource from DB
                    removeResource(resource, channelId)
                }else{
                    sbConnection.sendMessageToChannel(channelId, `You cannot remove a resource which is being used (is claimed by someone). :think-about-it: \n Please ask <@${resource.owner}> to release *${name}* in order to proceed.`)
                }
            }else{
                // remove resource from DB
                removeResource(resource, channelId)
            }
        }else{
            sbConnection.sendMessageToChannel(channelId, `No such resource exists: *${name}* :wtf:`)
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
                    // let time = parseInt(new Date(resource.claimTime + resource.duration)/1000)
                    let time = resource.claimTime + resource.duration
                    sbConnection.sendMessageToChannel(channelId, `Cannot claim the resource *${name}* as it is already being used by <@${resource.owner}> till ${getSlackTimeString(time)} :let_me:in:`)
                }
            }else{
                // claim the resource
                claimResource(resource, name, duration, claimTime, owner, description, channelId)
            }
        }else{
            sbConnection.sendMessageToChannel(channelId, `No such resource exists: *${name}* :kekw:`)
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
                    releaseResource(resource, channelId)
                }else{
                    sbConnection.sendMessageToChannel(channelId, `You cannot release *${name}* as it was not claimed by you. :excuseme: \n Please ask <@${resource.owner}> to release`)
                }
            }else{
                sbConnection.sendMessageToChannel(channelId, `No need to release as *${name}* is already available :facepalm:`)
            }
        }else{
            sbConnection.sendMessageToChannel(channelId, `No such resource exists: *${name}* :dumb:`)
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
                finalString += ' *Claimed on:* ' + getSlackTimeString(element.claimTime)//Need to format it as DD MM YYYY
                finalString += ' *Claimed till:* ' + getSlackTimeString(element.claimTime + element.duration)//Need to format it as DD MM YYYY
                // finalString += ' *Claimed on:* ' + '<!date^'+parseInt(element.claimTime/1000)+'^{date}|Date not available :person_frowning:>'//Need to format it as DD MM YYYY
                // finalString += ' *Claimed till:* ' + '<!date^'+parseInt((element.claimTime + element.duration)/1000)+'^{date}|Date not available :person_frowning:>' //Need to format it as DD MM YYYY
            }
            
            finalString += '\n'
        }

        if(!finalString){
            finalString = "No resources present in the database. :computerrage: \nPlease create new resource using the \`add\` command. \nRun \`help\` to get a list of all the commands."
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

        if(simplefiedArray.length){
            sbConnection.sendMessageToChannel(channelId, 'Please find available resources below: \n'+simplefiedArray.join('\n'))
        }else{
            sbConnection.sendMessageToChannel(channelId, `No resources are available. :panik:`)
        }
    }).catch((e) =>{
        logger.log(e)
    })
}

function removeResource(resource, channelId){
    try{
        RESOURCE.findByIdAndDelete(resource._id).then(deletedResource => {
            if(deletedResource){
                // logger.log("removeExistingResource success", deletedResource)
                sbConnection.sendMessageToChannel(channelId, `*${resource.name}* deleted succesfully :success:`)
            }else{
                sbConnection.sendMessageToChannel(channelId, `Unable to delete *${resource.name}* :ahhhhhhhhh:`)
            }
        }).catch((err) => {
            logger.log("removeExistingResource failure", err)
            sbConnection.sendMessageToChannel(channelId, `Unable to delete *${resource.name}* :awkward_monkey_look:`)
        })
    }catch(e){
        logger.log(e)
    }
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
            sbConnection.sendMessageToChannel(channelId, `*${name}* has been claimed successfully by <@${owner}> :catjam:`)
        }).catch((e)=>{
            sbConnection.sendMessageToChannel(channelId, `Some error occured while claiming *${name}* :among_us_report:`)
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
            sbConnection.sendMessageToChannel(channelId, `*${updatedDocument.name}* has been released successfully by <@${resource.owner}> :among_us_orange_dance:`)
        }).catch((e)=>{
            sbConnection.sendMessageToChannel(channelId, `Some error occured while releasing ${resource.name} :among_us_report:`)
        })
        
    }catch(e){
        logger.log(e)
    }

}

// function getTime(time){
//     //time will be in miliseconds
//     let fullDate = new Date(time)

//     let year = fullDate.getFullYear()
//     let month = fullDate.getMonth();
//     let date = fullDate.getDate()

//     let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


//     let hour = fullDate.getHours()
//     let minutes = fullDate.getMinutes()

//     return `${date} ${months[month]}, ${year}- ${hour}:${minutes}`
// }

function getSlackTimeString(time){
    // time in milliseconds
    time = Math.floor(time/1000);
    return `<!date^${time}^{date_num} at {time}|->`
}

dbConnection.addMultipleResource =  async function(body, channelId) {
    let allResources = await RESOURCE.find({'name' : {$in : body}, channelId : channelId})
    if(allResources.length){
        allResources = allResources.map((resource)=>{
            return resource.name;
        })

        body = body.filter((item)=>{
            return !allResources.includes(item)
        })
    }
    // Filter out duplicate values
    body = body.filter((elem, index, array)=>{
        return array.indexOf(elem) === index;
    })
    // Create required format to push in Mongo 
    body = body.map((obj)=>{
        return {
            name: obj,
            channelId: channelId
        }
    })

    RESOURCE.insertMany(body).then(function(){
            let message = '';
            if(allResources.length){
                message += '*' + allResources.join(",") + '* already exists in the database and were not re-added. \n'
            }
            minifiedBody = body.map((item)=> item.name)
            if(minifiedBody){
                message += '*' + minifiedBody.join(",") + '* were successfully added in the database :cool-doge:\n'
            }
            sbConnection.sendMessageToChannel(channelId, message)
            logger.log("Data inserted")  // Success
        }).catch(function(error){
            logger.log(error)      // Failure
        });
}
