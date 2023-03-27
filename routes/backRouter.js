const express = require("express")
const User = require("./../database/user")
const Changelog = require("./../database/changelog")
const router = express.Router()

router.get("/", (req, res) => {
    res.redirect("/back/login")
})

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
        console.log(req.session)
        if(req.session.isAdmin == true){
            res.redirect("/back/dashboard")
        } else{
            if(user.password == password){
                req.session.isAdmin = true
                req.session.userId = user._id.toString()
                res.redirect("/back/dashboard")
            } else {
                console.log(user.password, password)
                res.redirect("/back/login")
            }
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
    let change = await Changelog.findById(req.params.id)
    res.render("pages/viewChange", {change: change})
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
    change.createdBy = req.session.userId
    try{
        await change.save()
        await User.updateMany({}, {hasSeenChangelog: false})

    } catch (e){
        console.log(e)
    }
    res.redirect("/back/dashboard")
})

// Edit change
router.get("/change/edit/:id", async(req, res) => {
    let change = await Changelog.findById(req.params.id)
    res.render("pages/editChange", {change: change})
})

// Edit change POST
router.post("/change/edit/:id", async(req, res) => {
    let change = await Changelog.findById(req.params.id)
    change.version = req.body.version
    change.name = req.body.name
    change.description = req.body.description
    change.createdBy = req.session.userId
    try{
        await change.save()
    } catch(e){
        console.log(e)
    }
    res.redirect(`/back/change/view/${req.params.id}`)
})

// Delete change

module.exports = router