const express = require("express")
const axios = require("axios")
const crypto = require("crypto")
const User = require("./../database/user")
const Team = require("./../database/team")
const router = express.Router();
const URL = "https://www.balldontlie.io/api/v1"
const algorith = "aes-256-cbc"

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

// register
router.get("/users/register", (req, res) => {
    res.render("pages/register")
})

// register POST
router.post("/users/register", (req, res) => {
    req.user = new User()
    let user = req.user
    user.username = req.body.username
    user.email = req.body.email
    
})

// add player to team POST
router.post("/teams/add/players/:id", async (req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.id}`)
    req.team = new Team()
    let team = req.team
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
    res.redirect("/")
})

// show all teams
router.get("/teams/show", async(req, res) => {
    let teams = await Team.find()
    res.render("pages/showTeams", {teams: teams})
})

// view team
router.get("/teams/:id/view", async(req, res) => {
    let team = await Team.findById(req.params.id)
    console.log(team)
    res.render("pages/team", {team: team})
})

// create new team
router.get("/teams/create", (req, res) => {
    res.render("pages/createTeam")
})

module.exports = router