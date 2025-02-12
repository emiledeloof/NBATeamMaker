const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    name: {
        type: String
    },
    version: {
        type: String
    },
    description: {},
    date: {
        type: Date,
        default: Date.now()
    },
    createdBy:{
        type: String
    }
})

module.exports = mongoose.model("changelog", schema)