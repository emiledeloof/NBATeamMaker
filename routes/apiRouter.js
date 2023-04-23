const express = require("express")
const router = express.Router()
const types = require("./../types")
const User = require("./../database/user")

router.get("/types/notifications", (req, res) => {
    res.send(types.notificationTypes)
})

router.get("/reset-password/:token", async (req, res) => {
    res.render("pages/resetPassword", {
        token: req.params.token
    })
})

router.post("/reset-password/:token", async (req, res) => {
    let user = await User.findOne({passwordResetToken: req.params.token})
    if(req.body.password === req.body.confirmPassword){
        try{
            user.password = req.body.confirmPassword
            await user.save()
        } catch(e){
            console.log(e)
        }
        res.send("updated password. New password: " + req.body.confirmPassword)
    } else {
        res.redirect("back")
    }
})

module.exports = router