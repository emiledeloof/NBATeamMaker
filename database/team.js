const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    name:{
        type: String,
        unique: true
    },
    center: {},
    powerForward: {},
    smallForward: {},
    shootingGuard: {},
    pointGuard: {},
    userId:{},
    league: {}
})

module.exports = mongoose.model("team", schema)