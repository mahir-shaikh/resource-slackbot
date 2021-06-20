var dbConnect = {};
module.exports = dbConnect;

const mongoose = require("mongoose");
const MongoDBURL = process.env.MONGO_URL;
var RESOURCE = require("../models/ResourceModel");


dbConnect.connect = function() {
  //Mongoose connection
  return mongoose.connect(MongoDBURL, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useFindAndModify: false
  });
};

dbConnect.findOne = (obj) => RESOURCE.findOne(obj);

dbConnect.findMany = (obj) => RESOURCE.find(obj);

dbConnect.addNewResource = (obj) => new RESOURCE(obj).save();

dbConnect.removeExistingResource = (ID) => RESOURCE.findByIdAndDelete(ID);

dbConnect.updateResource = (ID, obj) => RESOURCE.findByIdAndUpdate(ID, obj);

dbConnect.getAvailableResources = (channelId) => RESOURCE.find({ isClaimed: false, channelId: channelId })

dbConnect.getMyClaimedResources = (channelId, owner) => RESOURCE.find({ isClaimed: true, channelId: channelId, owner: owner });

dbConnect.getAllResources = (channelId) => RESOURCE.find({ channelId: channelId });

dbConnect.addMultipleResource = (body) => RESOURCE.insertMany(body);

dbConnect.deleteAllResourceBelongingToChannel = (channelId) => RESOURCE.deleteMany({ channelId: channelId });

dbConnect.updateMany = (filter, body) => RESOURCE.updateMany(filter, body);