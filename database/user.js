const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        maxlength: 35,
        trim: true
    },
    email: {
        type: String,
        
    },
    password: {
        type: String,
        required: true
    },
    hasSeenChangelog: {
        type: Boolean
    },
    friends: [],
    friendRequestsReceived: [],
    friendRequestsSent: [],
    leagues: []
})

module.exports = mongoose.model("user", schema)