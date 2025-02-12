const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    name: {
        type: String
    },
    users: [],
    public: {
        type: Boolean
    },
    requests: [],
    maxUsers: {
        type: Number,
        max: 50
    },
    invitesSent: []
})

module.exports = mongoose.model("league", schema)