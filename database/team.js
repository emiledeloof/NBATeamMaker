const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    players: [],
    userId:{},
    league: {},
    teamScore: {}
})

module.exports = mongoose.model("team", schema)