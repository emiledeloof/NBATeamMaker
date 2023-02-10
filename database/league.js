const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    name: {
        type: String
    },
    users: [

    ]
})

module.exports = mongoose.model("league", schema)