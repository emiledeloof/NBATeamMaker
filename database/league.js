const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    name: {
        type: String
    },
    users: [],
    public: {
        type: Boolean
    },
    requests: []
})

module.exports = mongoose.model("league", schema)