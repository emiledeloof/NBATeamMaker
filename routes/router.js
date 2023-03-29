if(process.env.NODE_ENV !== "production"){
    require("dotenv").config();
}

const express = require("express")
const axios = require("axios")
const User = require("./../database/user")
const Team = require("./../database/team")
const League = require("./../database/league")
const Changelog = require("./../database/changelog")
const router = express.Router();
const URL = "https://www.balldontlie.io/api/v1"
// const algorithm = "aes-256-cbc"
const nbaURL = "http://data.nba.net/data/10s/prod/v1/2022/players.json"
const schedule = require("node-schedule")
const version = 0.1
// const initVector = crypto.randomBytes(16)
// const securityKey = crypto.randomBytes(32)
// const cipher = crypto.createCipheriv(algorithm, securityKey, initVector)
// const decipher = crypto.createDecipheriv(algorithm, securityKey, initVector)

// schedule.scheduleJob("* * * * *", async () => {
schedule.scheduleJob("0 0 12 * * *", async () => {
    // let date = new Date(Date.now()).toISOString().split("T")[0]
    // let games = await axios.get(`${URL}/games?seasons[]=2022&start_date=${date.toString()}&end_date=${date.toString()}`)
    // games.data.data.forEach(game, async (game) => {
    //     console.log(game)
    //     let home = game.home_team.name
    //     let visitors = game.visitor_team.name
        
    // })
    let teams = await Team.find()
    for(i=0; i<teams.length; i++){
        if(i % 11 === 0){
            sleep(7000)
        }
        console.log(teams[i])
        addScores(teams[i])
    }
})

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

router.get("/", async (req, res) => {
    if(req.session.userId){
        res.redirect("/pages/dashboard")
    } else{
        res.redirect("/pages/login")
    }
})

// register
router.get("/register", (req, res) => {
    res.render("pages/register")
})

// register POST
router.post("/users/register", async (req, res) => {
    req.user = new User()
    let user = req.user
    user.username = req.body.username
    user.email = req.body.email
    user.lastSeenVersion = version
    // let encryptedData = cipher.update(req.body.password, "utf-8", "hex");
    // user.password = encryptedData + cipher.final("hex");
    user.password = req.body.password
    req.session.userId = user._id.toString()
    try{
        await user.save()
        res.redirect(`/pages/dashboard`)
    } catch (e){
        console.log(e)
        res.redirect("/pages/users/register")
    }
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
                req.session.userId = user._id.toString()
                req.session.isAdmin = false
                req.session.username = user.username
                req.session.sessionId = req.sessionID
                res.redirect('/pages/dashboard')
        } else {
            throw new Error("Incorrect username or password")
        }
    } catch (e){
        console.log(e)
        res.redirect("/pages/login")
    }
})

// Sign out POST
router.post("/sign-out", async(req, res) => {
    req.session.destroy((e) => {
        if(e) console.log(e)
        else res.redirect("/")
    })
})

// dashboard
router.get("/dashboard", async(req, res) => {
    let user = await User.findById(req.session.userId)
    let changelog = await Changelog.find().limit(15).exec()
    let leagues = await League.find({users: {$elemMatch: {id: req.session.userId}}})
    res.render("pages/dashboard", {
        userId: req.session.userId, 
        leagues: leagues, 
        username: user.username, 
        changelog: changelog,
        hasSeenChangelog: user.hasSeenChangelog,
        URL: process.env.URL,
        username: req.session.username
    })
})

// Change hasSeenChange state
router.post("/dashboard/hasSeenChange/:userId", async(req, res) => {
    let user = await User.findById(req.params.userId)
    user.hasSeenChangelog = true
    try{
        user.save()
        res.status(200).json({message: "Updated changeState"})
    } catch (e){
        console.log(e)
        res.status(501).json({message: "Internal server error"})
    }
})

// search user POST
router.post("/search-user", async(req, res) => {
    res.redirect(`/pages/search-user/${req.body.searchUser}`)
})

// search user results
router.get("/search-user/:searchUser", async(req, res) => {
    let users = await User.find({username: {$regex: req.params.searchUser, $options: "i"}})
    let user = await User.findById(req.session.userId)
    res.render("pages/searchResults", {
        users: users,
        type: "user",
        search: req.params.searchUser,
        loggedIn: true,
        currentUser: user,
        username: req.session.username
    })
})

// add friend POST
// Send friend request POST
router.post("/friends/:friendId/add", async (req, res) => {
    let user = await User.findById(req.session.userId)
    let friend = await User.findById(req.params.friendId)
    if(user.friendRequestsSent.filter(request => request.username == friend.username).length == 0){
        let sentRequestTo = {
            username: friend.username,
            id: friend._id,
            date: Date.now()
        }   
        let dataToSend = {
            username: user.username,
            id: user._id,
            date: Date.now()
        }
        user.friendRequestsSent.push(sentRequestTo)
        friend.friendRequestsReceived.push(dataToSend)
    } else {
        throw new Error("A friend request has already been sent.")
    }
    try{
        await user.save()
        await friend.save()
    } catch(e){
        console.log(e)
    }
    if(req.query.redirect == "search"){
        res.redirect(`/pages/searh-user/${req.query.search}`)
    } else {
        res.redirect(`/pages/dashboard`)
    }
})

// Accept friend request POST
router.post("/friends/:friendId/accept", async(req, res) => {
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
    let indexOfRequest = user.friendRequestsReceived.findIndex(request => request.id == friend._id)
    user.friendRequestsReceived.splice(indexOfRequest, 1)
    let indexOfSent = friend.friendRequestsSent.findIndex(request => request.id == user._id)
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
    res.redirect(`/pages/profile`)
})

// Reject friend request POST
router.post("/friends/:friendId/reject", async(req, res) => {
    let user = await User.findById(req.params.id)
    let friend = await User.findById(req.params.friendId)
    let indexOfRequest = user.friendRequestsReceived.findIndex(request => request.id == friend._id)
    user.friendRequestsReceived.splice(indexOfRequest, 1)
    let indexOfSent = friend.friendRequestsSent.findIndex(request => request.id == user._id)
    friend.friendRequestsSent.splice(indexOfSent, 1)
    try{
        await user.save()
        await friend.save()
    } catch (e){
        console.log(e)
    }
    res.redirect(`/pages/profile`)
})

// Remove friend POST
router.post("/friends/:friendId/remove", async (req, res) => {
    let user = await User.findById(req.params.id)
    let friend = await User.findById(req.params.friendId)
    let index = user.friends.findIndex(friend => friend.id == req.params.friendId)
    user.friends.splice(index, 1)
    let friendIndex = friend.friends.findIndex(friend => friend.id == req.params.id)
    friend.friends.splice(friendIndex, 1)
    try{
        await user.save()
        await friend.save()
    } catch (e){
        console.log(e)
    }
    res.redirect(`/pages/profile`)
})

// Undo friend request POST
router.post("/friends/:requestId/undo", async (req, res) => {
    let user = await User.findById(req.session.userId)
    let friend = await User.findById(req.params.requestId)
    let userIndex = friend.friendRequestsReceived.findIndex(request => request.id == req.params.id)
    friend.friendRequestsReceived.splice(userIndex, 1)
    let friendIndex = user.friendRequestsSent.findIndex(request => request.id == req.params.requestId)
    user.friendRequestsSent.splice(friendIndex, 1)
    try{
        await user.save()
        await friend.save()
    } catch(e){
        console.log(e)
    }
    if(req.query.redirect == "search"){
        res.redirect(`/pages/search-user/${req.query.search}`)
    } else {
        res.redirect(`/pages/profile`)
    }
})

// profile
router.get("/profile", async (req, res) => {
    let user = await User.findById(req.session.userId)
    if(user !== null){
        res.render("pages/profile", {user: user, username: user.username})
    } else {
        res.redirect("/")
    }
})

// view other profile
router.get("/view-profile/:otherUser", async(req, res) => {
    let user = await User.findById(req.params.otherUser)
    let currentUser = await User.findById(req.session.userId)
    res.render("pages/viewProfile", {
        user: user,
        currentUser: currentUser,
        username: user.username
    })
})

// search
router.post("/players/search", async(req, res) => {
    let request = await axios.get(`${URL}/players?search=${req.body.search}`)
    res.render("pages/searchResults", {
        search: req.body.search, 
        results: request.data.data,
        loggedIn: false,
        type: "player",
        username: req.session.username
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
        loggedIn: false,
        username: req.session.username
    })
})

// add player to team POST
// Create team
router.post("/teams/leagues/:leagueId/add/players/:id", async (req, res) => {
    try{
        let player = await axios.get(`${URL}/players/${req.params.id}`)
        let league = await League.findById(req.params.leagueId)
        let index = league.users.findIndex(user => user.id == req.session.userId)
        let isAuthenticated = false
        let team
        console.log(req.cookies.currentSession)
        if(await Team.findOne({name: req.query.teamName})){
            team = await Team.findOne({name: req.query.teamName})
            if(team.userId == req.session.userId){
                isAuthenticated = true
            }
        } else {
            req.team = new Team()
            team = req.team
            team.name = req.query.teamName
            team.userId = req.session.userId
            team.league = {
                id: req.params.leagueId,
                name: league.name
            }
            league.users[index].teamId = team._id.toString()
            league.markModified("users")
            isAuthenticated = true
        }
        if(isAuthenticated == true){
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
        } else{
            throw new Error("A team with this name already exists! \nPlease refresh the page to create another team.")
        }
        addScores(req.params.id, team)
        team.markModified("shootingGuard")
        team.markModified("pointGuard")
        team.markModified("powerForward")
        team.markModified("smallForward")
        team.markModified("center")
        await team.save()
        await league.save()
        res.status(200).json({message: "Succes"})
    } catch (e){
        console.log(e)
        res.status(406).json({message: e.toString()})
    }
})

// edit player on team POST
router.post("/teams/:teamId/edit/players/:id", async (req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.id}`)
    let team = await Team.findById(req.params.teamId)
    let league = await League.findById(team.league.id)
    let index = league.users.findIndex(user => user.id == team.userId)
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
        await addScores(req.params.id, team)
        let teamScore =  team.shootingGuard.score.score + team.pointGuard.score.score + team.smallForward.score.score + team.powerForward.score.score + team.center.score.score 
        team.teamScore = teamScore
        team.markModified("shootingGuard")
        team.markModified("pointGuard")
        team.markModified("powerForward")
        team.markModified("smallForward")
        team.markModified("center")
        league.users[index].teamScore = teamScore
        league.markModified("users")
        await team.save()
        await league.save()
        res.end()
    } catch(e){
        console.log(e)
        res.send(e)
    }
})

// show all teams
router.get("/teams/show", async(req, res) => {
    let teams = await Team.find({userId: req.session.userId})
    res.render("pages/showTeams", {
        teams: teams, 
        username: req.session.username
    })
})

// view team
router.get("/leagues/:leagueId/teams/:id/view", async(req, res) => {
    let team = await Team.findById(req.params.id)
    // if(team.pointGuard && team.shootingGuard && team.powerForward && team.smallForward && team.center){
    //     team.pointGuard.scoreData = await calculateScore(team.pointGuard.id)
    //     team.shootingGuard.scoreData = await calculateScore(team.shootingGuard.id)
    //     team.powerForward.scoreData = await calculateScore(team.powerForward.id)
    //     team.smallForward.scoreData = await calculateScore(team.smallForward.id)
    //     team.center.scoreData = await calculateScore(team.center.id)
    //     team.totalScore = parseInt(team.pointGuard.score) + parseInt(team.shootingGuard.score) + parseInt(team.powerForward.score) + parseInt(team.smallForward.score) + parseInt(team.center.score)
    // }
    try{
        await team.save()
    } catch(e){
        console.log(e)
    }
    let url = process.env.URL
    res.render("pages/team", {
        team: team, 
        url: url, 
        leagueId: req.params.leagueId,
        username: req.session.username
    })
})

// view other team
router.get("/leagues/:leagueId/teams/:id/view-other", async(req, res) => {
    let team = await Team.findById(req.params.id)
    // if(team.pointGuard && team.shootingGuard && team.powerForward && team.smallForward && team.center){
    //     team.pointGuard.score = await calculateScore(team.pointGuard.id)
    //     team.shootingGuard.score = await calculateScore(team.shootingGuard.id)
    //     team.powerForward.score = await calculateScore(team.powerForward.id)
    //     team.smallForward.score = await calculateScore(team.smallForward.id)
    //     team.center.score = await calculateScore(team.center.id)
    // }
    try{
        await team.save()
    } catch(e){
        console.log(e)
    }
    let url = process.env.URL
    let params = {
        team: team,
        userId: req.session.userId,
        leagueId: req.params.leagueId,
        url: url,
        username: req.session.username
    }
    if(req.session.userId == team.userId){
        res.render("pages/team", params)
    } else {
        res.render("pages/viewOtherTeam", params)
    }
})

// create new team
router.get("/leagues/:leagueId/teams/create", (req, res) => {
    let url = process.env.URL
    console.log(req.session)
    res.cookie("currentSession", req.sessionID, {
        sameSite:"none",
        "secure": true
    })
    res.render("pages/createTeam", {
        url: url, 
        leagueId: req.params.leagueId,
        username: req.session.username
    })
})

// delete team POST
router.post("/leagues/:leagueId/teams/:id/delete", async(req, res) => {
    await Team.findByIdAndDelete(req.params.id)
    let league = await League.findById(req.params.leagueId)
    let index = league.users.findIndex(user => user.teamId == req.params.id)
    try{
        league.users[index].teamId = null
        league.markModified("users")
        await league.save()
    } catch (e) {
        console.log(e)
    }
    res.redirect(`/pages/teams/show`)
})

// view player when logged in
router.get("/players/:playerId", async(req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.playerId}`)
    let allPlayers = await axios.get(nbaURL)
    let nbaPlayer = allPlayers.data.league.standard.find(firstName => firstName.firstName == player.data.first_name, lastName => lastName.lastName == player.data.last_name)
    let stats = await axios.get(`${URL}/season_averages?player_ids[]=${req.params.playerId}`)
    let score = await calculateScore(req.params.playerId, stats.data.data[0])
    res.render("pages/playerDetails", {
        player: player.data,
        stats: stats.data.data[0],
        personId: nbaPlayer.personId,
        loggedIn: true,
        score: score,
        username: req.session.username
    })
})

// Create league
router.get("/leagues/create", (req, res) => {
    res.render("pages/createLeague", {
        username: req.session.username
    })
})

// Create league POST
router.post("/leagues/create", async (req, res) => {
    let user = await User.findById(req.session.userId)
    let userData = {
        username: user.username,
        id: req.session.userId,
        date: Date.now(),
        teamId: null
    }
    let league = new League()
    league.name = req.body.name
    league.users.push(userData)
    league.public = req.body.public
    let leagueData = {
        id: league._id,
        name: league.name
    }
    user.leagues.push(leagueData)
    try{
        await league.save()
        await user.save()
    } catch(e){
        console.log(e)
    }
    res.redirect(`/pages/leagues/${league._id}`)
})

//view league
router.get("/leagues/:leagueId", async (req, res) => {
    let league = await League.findById(req.params.leagueId)
    let teams = await Team.find({"league.id": req.params.leagueId})
    let isJoined = false
    let hasTeam = false
    let userIndex
    if(league.users.findIndex(element => element.id == req.session.userId) != -1){
        isJoined = true
        userIndex = league.users.findIndex(element => element.id == req.session.userId)
        if(league.users[userIndex].teamId != null){
            hasTeam = true
        }
    }
    res.render("pages/showLeague", {
        league: league, 
        isJoined: isJoined,
        hasTeam: hasTeam,
        teams: teams,
        username: req.session.username
    })
})

// view all leagues
router.get("/leagues", async(req, res) => {
    let leagues = await League.find({public: true}).limit(30).exec()
    leagues.forEach(league => {
        league.usersAmount = league.users.length
    })
    // let leagues = await League.find({public: true})
    res.render("pages/allLeagues", {
        leagues: leagues,
        username: req.session.username
    })
})

// Search league POST
router.post("/leagues/search", async(req, res) => {
    let leagues = await League.find({name: {$regex: req.body.league, $options: "i"}})
    res.render("pages/searchResults", {
        type: "league",
        leagues: leagues,
        search: req.body.league,
        loggedIn: true,
        username: req.session.username
    })
})

// request to join a league
router.post("/leagues/:leagueId/join", async (req, res) => {
    let league = await League.findById(req.params.leagueId)
    let user = await User.findById(req.session.userId)
    let dataToSend = {
        username: user.username,
        id: req.session.userId,
        date: Date.now()
    }
    league.requests.push(dataToSend)
    try{
        await league.save()
    } catch (e){
        console.log(e)
    }
    res.redirect(`/pages/leagues/${req.params.leagueId}`)
})

// league settings
router.get("/leagues/:leagueId/settings", async (req, res) => {
    let league = await League.findById(req.params.leagueId)
    res.render("pages/leagueSettings", {
        league: league,
        username: req.session.username
    })
})

// Leave league
router.post("/leagues/:leagueId/leave", async (req, res) => {
    let user = await User.findById(req.session.userId)
    let league = await League.findById(req.params.leagueId)
    let userIndex = user.leagues.findIndex(league => league.id == req.params.leagueId)
    user.leagues.splice(userIndex, 1)
    let leagueIndex = league.users.findIndex(user => user.id == req.session.userId)
    league.users.splice(leagueIndex, 1)
    try{
        user.markModified("leagues")
        league.markModified("users")
        await user.save()
        await league.save()
    } catch(e){
        console.log(e)
    }
    res.redirect(`/pages/dashboard`)
})

// Accept request to join league
router.post("/leagues/:leagueId/request/:requestId/accept", async (req, res) => {
    let league = await League.findById(req.params.leagueId)
    let user = await User.findById(req.params.requestId)
    let dataToSend = {
        username: user.username,
        id: req.params.requestId,
        teamId: null
    }
    let leagueData = {
        id: req.params.leagueId,
        name: league.name
    }
    let index = league.requests.findIndex(element => element.id == dataToSend.id)
    league.requests.splice(index, 1)
    dataToSend.date = Date.now()
    league.users.push(dataToSend)
    user.leagues.push(leagueData)
    try{
        await league.save()
        await user.save()
    } catch (e){
        console.log(e)
    }
    res.redirect(`/pages/leagues/${req.params.leagueId}/settings`)
})

// Reject request to join league
router.post("/leagues/:leagueId/request/:requestId/reject", async (req, res) => {
    let league = await League.findById(req.params.leagueId)
    let user = await User.findById(req.params.requestId)
    let dataToSend = {
        username: user.username,
        id: req.params.requestId,
    }
    let index = league.requests.findIndex(element => element.id == dataToSend.id)
    league.requests.splice(index, 1)
    try{
        await league.save()
    } catch (e){
        console.log(e)
    }
    res.redirect(`/pages/leagues/${req.params.leagueId}/settings`)
})

async function calculateScore(playerId, statsVar = null){
    if(statsVar == null){
        let stats = await axios.get(`${URL}/season_averages?player_ids[]=${playerId}`)
        statsVar = stats.data.data[0]
    }
    let ppgScore = 1000 * statsVar.pts * statsVar.fg_pct
    let apgScore = 750 * statsVar.ast
    let spgScore = 1250 * statsVar.stl
    let blkScore = 1250 * statsVar.blk
    let rpgScore = 750 * statsVar.reb
    let turnoverScore = 1250 * statsVar.turnover
    let score = 1000 + ppgScore + apgScore + spgScore + blkScore + rpgScore - turnoverScore
    score = score.toFixed(0)
    let scoreData = {
        score: parseInt(score),
        game: statsVar.games_played,
        dateUpdated: Date.now()
    }
    return scoreData
}

async function addScores(playerId, team){
    try{
        if(team.shootingGuard && team.pointGuard && team.powerForward && team.smallForward && team.center){
            team.center.score = await calculateScore(team.center.id)
            team.powerForward.score = await calculateScore(team.powerForward.id)
            team.smallForward.score = await calculateScore(team.smallForward.id)
            team.shootingGuard.score = await calculateScore(team.shootingGuard.id)
            team.pointGuard.score = await calculateScore(team.pointGuard.id)
        }
    } catch (e){
        console.log(e)
    }
}

module.exports = router