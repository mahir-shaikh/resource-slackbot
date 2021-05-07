const mongoose = require('mongoose')
const Schema = mongoose.Schema;

const ResourceSchema = new Schema({
    name: {
        type: String,
        unique: true,
        required: true
    },

    project: {
        type: String
    },

    owner: {
        type: String
    },

    message: {
        type: String
    },

    claimTime: {
        type: Date
    },

    isClaimed: {
        type: Boolean,
        required: true,
        default: false
    }
})

module.exports = mongoose.model( 'resources', ResourceSchema)