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
    res.redirect("/")
})

// search
router.post("/search", async(req, res) => {
    let request = await axios.get(`${URL}/players?search=${req.body.search}`)
    res.render("pages/searchResults", {search: req.body.search, results: request.data.data})
})

// player info
router.get("/players/:id", async (req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.id}`)
    let stats = await axios.get(`${URL}/season_averages?player_ids[]=${req.params.id}`)
    res.render("pages/playerDetails", {
        player: player.data,
        stats: stats.data.data[0]
    })
})

// add player to team POST
router.post("/teams/add/players/:id", async (req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.id}`)
    let team
    if(await Team.findOne({name: req.query.teamName})){
        team = await Team.findOne({name: req.query.teamName})
    } else {
        req.team = new Team()
        team = req.team
        team.name = req.query.teamName
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

// edit player on team POST
router.post("/teams/:teamId/edit/players/:id", async (req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.id}`)
    let team = await Team.findById(req.params.teamId)
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
router.get("/teams/show", async(req, res) => {
    let teams = await Team.find()
    res.render("pages/showTeams", {teams: teams})
})

// view team
router.get("/teams/:id/view", async(req, res) => {
    let team = await Team.findById(req.params.id)
    let url = process.env.URL
    res.render("pages/team", {team: team, url: url})
})

// create new team
router.get("/teams/create", (req, res) => {
    res.render("pages/createTeam", {url: process.env.URL})
})

// delete team POST
router.post("/teams/:id/delete", async(req, res) => {
    await Team.findByIdAndDelete(req.params.id)
    res.redirect("/pages/teams/show")
})

module.exports = router