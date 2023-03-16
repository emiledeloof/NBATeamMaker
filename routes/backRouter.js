const express = require("express")
const User = require("./../database/user")
const Changelog = require("./../database/changelog")
const router = express.Router()

// Backend
router.get("/login", async(req, res) => {
    res.render("pages/back", {loggedIn: false})
})

// Login backend
router.post("/login", async(req, res) => {
    let username = req.body.username
    let password = req.body.password
    let user = await User.findOne({username: username, isAdmin: true})
    try{
        if(user.password == password){
            req.session.regenerate(function (err) {
                if (err) console.log(err)
                req.session.isAdmin = true
                req.session.userId = user._id.toString()
                console.log(req.session)
                req.session.save(function (err) {
                    if (err) return next(err)
                    res.redirect("/back/dashboard")
                })
            })
        } else {
            console.log(user.password, password)
            res.redirect("/back/login")
        }
    } catch(e){
        console.log(e)
        res.redirect("/back/login")
    }
})

// Backend dashboard
router.get("/dashboard", async (req, res) => {
    let changelogs = await Changelog.find()
    if(req.session.isAdmin == true){
        res.render("pages/back", {
            loggedIn: true,
            changelogs: changelogs
        })
    } else {
        res.redirect("/back/login")
    }
})

// View change
router.get("/change/view/:id", async(req, res) => {

})

// create change
router.get("/change/create", async(req, res) => {
    if(req.session.isAdmin == true){
        res.render("pages/createChange")
    } else {
        res.redirect("/back/login")
    }
})

// Create change POST
router.post("/change/create", async(req, res) => {
    let change = new Changelog()
    change.name = req.body.name
    change.version = req.body.version
    change.description = req.body.description
    try{
        await change.save()
        await User.updateMany({}, {hasSeenChangelog: false})

    } catch (e){
        console.log(e)
    }
    res.redirect("/back/dashboard")
})

// Edit change

// Delete change

module.exports = router