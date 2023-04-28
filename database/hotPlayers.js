const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    player: {}
})

module.exports = mongoose.model("hotPlayers", schema)