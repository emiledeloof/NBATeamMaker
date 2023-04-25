const express = require("express")
const router = express.Router()
const types = require("./../types")
const User = require("./../database/user")

router.get("/types/notifications", (req, res) => {
    res.send(types.notificationTypes)
})

// Reset password
router.get("/reset-password/:token", async (req, res) => {
    res.render("pages/resetPassword", {
        token: req.params.token,
        isReset: false
    })
})

// Reset password POST
router.post("/reset-password/:token", async (req, res) => {
    let user = await User.findOne({"passwordResetToken.token": req.params.token})
    if(user !== null && user.passwordResetToken !== null && user.passwordResetToken.timestamp > Date.now() - 900000){
        if(req.body.password === req.body.confirmPassword){
            try{
                user.password = req.body.confirmPassword
                user.passwordResetToken = null
                await user.save()
            } catch(e){
                console.log(e)
            }
            res.render("pages/resetPassword", {
                isReset: true
            })
        } else {
            res.redirect("back")
        }
    } else {
        res.render("pages/resetPassword", {
            isReset: null,
            isTokenExpired: true
        })
    }
})

module.exports = router