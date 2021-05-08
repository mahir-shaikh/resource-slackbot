dbConnection = {}
module.exports = dbConnection

const mongoose = require('mongoose');
const MongoDBURL = process.env.MongoURL || "mongodb://localhost:27017/appusage-slackbot";
var RESOURCE = require('../models/ResourceModel')

const sbConnection = require('./slack-connection.js')
const logger = require('./logger')


dbConnection.connect = function(){
    //Mongoose connection
    mongoose.connect(MongoDBURL, { useUnifiedTopology: true, useNewUrlParser: true }).then(() => {
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
