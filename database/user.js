const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const schema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        maxlength: 35,
        trim: true
    },
    email: {
        type: String,
        
    },
    password: {
        type: String,
        required: true
    },
    hasSeenChangelog: {
        type: Boolean
    },
    friends: [],
    friendRequestsReceived: [],
    friendRequestsSent: [],
    leagues: [],
    leagueInvites: [],
    notifications: []
})

schema.pre("save", function(next){
    if(this.isModified("password")){
        bcrypt.hash(this.password, 8, (err, hash) => {
            if(err) console.log(err)

            this.password = hash
            next()
        })
    }
})

schema.methods.comparePassword = async function(password){
    if(!password) throw new Error("Missing password")

    try{
        const result = await bcrypt.compare(password, this.password)
        return result
    } catch(e){
        console.log(e)
    }
}

module.exports = mongoose.model("user", schema)