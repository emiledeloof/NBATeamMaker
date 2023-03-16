const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    versions: []
})

module.exports = mongoose.model("changelog", schema)