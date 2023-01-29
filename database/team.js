const mongoose = require("mongoose")

const schema = new mongoose.Schema({
    name:{
        type: String
    },
    center: {
        
    },
    powerForward: {
        
    },
    smallForward: {
        
    },
    shootingGuard: {
        
    },
    pointGuard: {
        
    }
})

module.exports = mongoose.model("team", schema)