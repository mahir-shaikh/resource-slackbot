
cronJob = {}
module.exports = cronJob

const mongoose = require('mongoose');
const MongoDBURL = process.env.MongoURL;
var RESOURCE = require('../models/ResourceModel')

const sbConnection = require('./slack-connection.js')
const logger = require('./logger')


const CronJob = require('cron').CronJob;

cronJob.startCron = function() {
    var job = new CronJob(
    '0 */60 * * * *', //Run every hour
    function(){ // function that should run on cron job
        onCronTick()
    },
    null, // on complete
    true, // start on exiting the constructor
    'America/Los_Angeles', //timezone
    null, //context
    true); // run job On Init
    job.start();
}

async function onCronTick() {
    try {
        logger.log("Cron Job running at: " + new Date())
        let allResources = await RESOURCE.find({isClaimed : true});
        let expiredResource = [];
        let aboutToExpireResource = [];
        let bufferTime = 24*60*60*1000; //24 hours
        let currentTime = new Date().getTime();
        for (let i = 0; i < allResources.length; i++) {
            let bucket = allResources[i];
            let totalTime = bucket.claimTime + bucket.duration;
            if(currentTime >= totalTime && bucket.notificationSent) {
                expiredResource.push(mongoose.Types.ObjectId(bucket._id));
            }else if(currentTime+bufferTime >= totalTime && !bucket.notificationSent){
                let obj = {
                    id: mongoose.Types.ObjectId(bucket._id),
                    owner: bucket.owner,
                    name: bucket.name,
                    channelId: bucket.channelId
                }
                aboutToExpireResource.push(obj)
            }
        }
        if(expiredResource.length) {
            releaseAll(expiredResource);
        }

        if(aboutToExpireResource.length) {
            sendNotification(aboutToExpireResource);
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
            isClaimed: false,
            notificationSent: false
        });
        logger.log( expiredResource.join(',') + ' were expired and have been released by cron job');
    } catch (error) {
        logger.log(error);
    }
}

function sendNotification(arrayOfNotifications){
    console.log(arrayOfNotifications)
    let arrayOfId = []
    for (let i = 0; i < arrayOfNotifications.length; i++) {
        const element = arrayOfNotifications[i];
        arrayOfId.push(element.id)

        let message = `<@${element.owner}> - Your claim on *${element.name}* is about to expire. If you are still not done, you can claim it again to extend the duration`
        sbConnection.sendMessageToChannel(element.channelId, message)
    }

    // Update DB so that we do not send the notification again in next cron job
    RESOURCE.updateMany({'_id' : {$in : arrayOfId}}, {
        notificationSent: true
    }).then(()=>{
        logger.log('Notifications sent updated in DB');
    }).catch((error)=>{
        logger.log(error);
    })
}