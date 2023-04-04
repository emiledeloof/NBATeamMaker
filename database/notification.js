const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    type: {
        type: String
    },
    data: {}
})

module.exports = mongoose.model("notification", schema)