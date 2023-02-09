if(process.env.NODE_ENV !== "production"){
    require("dotenv").config();
}

const express = require("express")
const axios = require("axios")
const crypto = require("crypto")
const User = require("./../database/user")
const Team = require("./../database/team")
const router = express.Router();
const URL = "https://www.balldontlie.io/api/v1"
const algorith = "aes-256-cbc"

// register
router.get("/users/register", (req, res) => {
    res.render("pages/register")
})

// register POST
router.post("/users/register", async (req, res) => {
    req.user = new User()
    let user = req.user
    user.username = req.body.username
    user.email = req.body.email
    user.password = req.body.password
    try{
        await user.save()
    } catch (e){
        console.log(e)
    }
    res.redirect(`/pages/users/${user._id}`)
})

// dashboard
router.get("/users/:id", async(req, res) => {
    res.render("pages/dashboard", {userId: req.params.id})
})

// login
router.get("/login", (req, res) => {
    res.render("pages/login")
})

// login POST
router.post("/users/login", async (req, res) => {
    let user
    let confirmedUser
    try{
        user = await User.findOne({username: req.body.username})
        if(user.password == req.body.password){
            confirmedUser = user
        }
    } catch (e){
        console.log(e)
    }
    res.redirect(`/pages/users/${user._id}`)
})

// search
router.post("/search", async(req, res) => {
    let request = await axios.get(`${URL}/players?search=${req.body.search}`)
    res.render("pages/searchResults", {search: req.body.search, results: request.data.data})
})

// player info
router.get("/players/:id", async (req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.id}`)
    res.render("pages/playerDetails", {
        player: player.data
    })
})

// add player to team POST
router.post("/teams/users/:userId/add/players/:id", async (req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.id}`)
    let team
    if(await Team.findOne({name: req.query.teamName})){
        team = await Team.findOne({name: req.query.teamName})
    } else {
        req.team = new Team()
        team = req.team
        team.name = req.query.teamName
        team.userId = req.params.userId
    }
    switch(req.body.position || req.query.position){
        case "C":
            team.center = player.data
            break;
        case "PF":
            team.powerForward = player.data
            break;
        case "SF":
            team.smallForward = player.data
            break;
        case "SG":
            team.shootingGuard = player.data
            break;
        case "PG":
            team.pointGuard = player.data
            break;
    }
    try{
        team = await team.save()
    } catch(e){
        console.log(e)
    }
    res.end()
})

// show all teams
router.get("/users/:userId/teams/show", async(req, res) => {
    let teams = await Team.find({userId: req.params.userId})
    res.render("pages/showTeams", {teams: teams, userId: req.params.userId})
})

// view team
router.get("/teams/:id/view", async(req, res) => {
    let team = await Team.findById(req.params.id)
    res.render("pages/team", {team: team, userId: req.params.userId})
})

// create new team
router.get("/users/:userId/teams/create", (req, res) => {
    let url = process.env.URL
    res.render("pages/createTeam", {userId: req.params.userId, url: url})
})

// delete team POST
router.post("/teams/:id/delete", async(req, res) => {
    await Team.findByIdAndDelete(req.params.id)
    res.redirect("/pages/teams/show")
})

module.exports = router