const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    type: {
        type: Number
    },
    userId: {},
    data: {}
})

module.exports = mongoose.model("notification", schema)