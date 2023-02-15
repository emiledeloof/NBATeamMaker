if(process.env.NODE_ENV !== "production"){
    require("dotenv").config();
}

const express = require("express")
const axios = require("axios")
// const crypto = require("crypto")
const User = require("./../database/user")
const Team = require("./../database/team")
const League = require("./../database/league")
const router = express.Router();
const URL = "https://www.balldontlie.io/api/v1"
// const algorithm = "aes-256-cbc"
const nbaURL = "http://data.nba.net/data/10s/prod/v1/2022/players.json"
// const initVector = crypto.randomBytes(16)
// const securityKey = crypto.randomBytes(32)
// const cipher = crypto.createCipheriv(algorithm, securityKey, initVector)
// const decipher = crypto.createDecipheriv(algorithm, securityKey, initVector)

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
    // let encryptedData = cipher.update(req.body.password, "utf-8", "hex");
    // user.password = encryptedData + cipher.final("hex");
    user.password = req.body.password
    try{
        await user.save()
        res.redirect(`/pages/users/${user._id}`)
    } catch (e){
        console.log(e)
        res.redirect("/pages/users/register")
    }
})

// dashboard
router.get("/users/:id", async(req, res) => {
    let leagues = await League.find({users: [req.params.id]})
    res.render("pages/dashboard", {userId: req.params.id, leagues: leagues})
})

// search user POST
router.post("/users/:id/search-user", async(req, res) => {
    res.redirect(`/pages/users/${req.params.id}/search-user/${req.body.searchUser}`)
})

// search user results
router.get("/users/:id/search-user/:searchUser", async(req, res) => {
    let users = await User.find({username: {$regex: req.params.searchUser, $options: "i"}})
    res.render("pages/searchResults", {
        users: users,
        type: "user",
        search: req.params.searchUser,
        loggedIn: true,
        userId: req.params.id
    })
})

// add friend POST
router.post("/users/:userId/friends/:friendId/add", async (req, res) => {
    let user = await User.findById(req.params.userId)
    let friend = await User.findById(req.params.friendId)
    let sentRequestTo = {
        username: friend.username,
        id: user._id,
        date: Date.now()
    }   
    let dataToSend = {
        username: user.username,
        id: user._id,
        date: Date.now()
    }
    user.friendRequestsSent.push(sentRequestTo)
    friend.friendRequestsReceived.push(dataToSend)
    try{
        await user.save()
        await friend.save()
    } catch(e){
        console.log(e)
    }
    res.redirect(`/pages/users/${req.params.userId}`)
})

// Accept friend request POST
router.post("/users/:id/friends/:friendId/accept", async(req, res) => {
    let user = await User.findById(req.params.id)
    let friend = await User.findById(req.params.friendId)
    let dataToSend = {
        username: friend.username,
        id: friend._id
    }
    let sent = {
        username: user.username,
        id: user._id
    }
    let indexOfRequest = user.friendRequestsReceived.indexOf(dataToSend)
    user.friendRequestsReceived.splice(indexOfRequest, 1)
    let indexOfSent = friend.friendRequestsSent.indexOf(sent)
    friend.friendRequestsSent.splice(indexOfSent, 1)
    dataToSend.date = Date.now()
    user.friends.push(dataToSend)
    sent.date = Date.now()
    friend.friends.push(sent)
    try{
        await user.save()
        await friend.save()
    } catch (e){
        console.log(e)
    }
    res.redirect(`/pages/users/${req.params.id}/profile`)
})

// Reject friend request POST
router.post("/users/:id/friends/:friendId/reject", async(req, res) => {
    let user = await User.findById(req.params.id)
    let friend = await User.findById(req.params.friendId)
    let dataToSend = {
        username: friend.username,
        id: friend._id
    }
    let sent = {
        username: user.username,
        id: user._id
    }
    let indexOfRequest = user.friendRequestsReceived.indexOf(dataToSend)
    user.friendRequestsReceived.splice(indexOfRequest, 1)
    let indexOfSent = friend.friendRequestsSent.indexOf(sent)
    friend.friendRequestsSent.splice(indexOfSent, 1)
    try{
        await user.save()
        await friend.save()
    } catch (e){
        console.log(e)
    }
    res.redirect(`/pages/users/${req.params.id}/profile`)
})

// Remove friend POST
router.post("/users/:id/friends/:friendId/remove", async (req, res) => {
    let user = await User.findById(req.params.id)
    let friend = await User.findById(req.params.friendId)
    let data = {
        username: friend.username,
        id: req.params.friendId
    }
    let friendData = {
        username: user.username,
        id: req.params.id
    }
    let index = user.friends.indexOf(data)
    user.friends.splice(index, 1)
    let friendIndex = friend.friends.indexOf(friendData)
    friend.friends.splice(friendIndex, 1)
    try{
        await user.save()
        await friend.save()
    } catch (e){
        console.log(e)
    }
    res.redirect(`/pages/users/${req.params.id}/profile`)
})

// profile
router.get("/users/:id/profile", async (req, res) => {
    let user = await User.findById(req.params.id)
    res.render("pages/profile", {user: user, userId: req.params.id})
})

// view other profile
router.get("/users/:id/view-profile/:otherUser", async(req, res) => {
    let user = await User.findById(req.params.id)
    res.render("pages/viewProfile", {
        user: user,
        userId: req.params.id
    })
})

// login
router.get("/login", (req, res) => {
    res.render("pages/login")
})

// login POST
router.post("/users/login", async (req, res) => {
    let user
    try{
        user = await User.findOne({username: req.body.username})
        // let decryptedData = decipher.update(user.password, "hex", "utf-8");
        // decryptedData += decipher.final("utf-8");
        if(user.password == req.body.password){
            confirmedUser = user
        }
        res.redirect(`/pages/users/${user._id}`)
    } catch (e){
        console.log(e)
        res.redirect("/pages/login")
    }
})

// search
router.post("/search", async(req, res) => {
    let request = await axios.get(`${URL}/players?search=${req.body.search}`)
    res.render("pages/searchResults", {
        search: req.body.search, 
        results: request.data.data,
        loggedIn: false,
        type: "player",
    })
})

// player info
router.get("/players/:id", async (req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.id}`)
    let stats = await axios.get(`${URL}/season_averages?player_ids[]=${req.params.id}`)
    let allPlayers = await axios.get(nbaURL)
    let nbaPlayer = allPlayers.data.league.standard.find(firstName => firstName.firstName == player.data.first_name, lastName => lastName.lastName == player.data.last_name)
    res.render("pages/playerDetails", {
        player: player.data,
        stats: stats.data.data[0],
        personId: nbaPlayer.personId,
        loggedIn: false
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
router.get("/users/:userId/teams/show", async(req, res) => {
    let teams = await Team.find({userId: req.params.userId})
    res.render("pages/showTeams", {teams: teams, userId: req.params.userId})
})

// view team
router.get("/users/:userId/teams/:id/view", async(req, res) => {
    let team = await Team.findById(req.params.id)
    let url = process.env.URL
    res.render("pages/team", {team: team, url: url, userId: req.params.userId})
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

// view player when logged in
router.get("/users/:userId/players/:playerId", async(req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.playerId}`)
    let stats = await axios.get(`${URL}/season_averages?player_ids[]=${req.params.playerId}`)
    let allPlayers = await axios.get(nbaURL)
    let nbaPlayer = allPlayers.data.league.standard.find(firstName => firstName.firstName == player.data.first_name, lastName => lastName.lastName == player.data.last_name)
    res.render("pages/playerDetails", {
        player: player.data,
        stats: stats.data.data[0],
        personId: nbaPlayer.personId,
        userId: req.params.userId,
        loggedIn: true
    })
})

// Create league
router.get("/users/:userId/leagues/create", (req, res) => {
    res.render("pages/createLeague", {userId: req.params.userId})
})

// Create league POST
router.post("/users/:userId/leagues/create", async (req, res) => {
    let league = new League()
    league.name = req.body.name
    league.users = [req.params.userId]
    try{
        league = await league.save()
    } catch(e){
        console.log(e)
    }
    res.redirect(`/pages/users/${req.params.userId}/leagues/${league._id}`)
})

//view league
router.get("/users/:userId/leagues/:leagueId", async (req, res) => {
    let league = await League.findById(req.params.leagueId)
    res.render("pages/showleague", {league: league, userId: req.params.userId})
})

// view all leagues
router.get("/users/:userId/leagues", async(req, res) => {
    let leagues = await League.find().limit(30).exec()
    res.render("pages/allLeagues", {
        userId: req.params.userId,
        leagues: leagues,
    })
})

module.exports = router