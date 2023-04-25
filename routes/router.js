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
const nbaURL = "http://data.nba.net/data/10s/prod/v1/2022/players.json"
const schedule = require("node-schedule")
const nodemailer = require("nodemailer")
const crypto = require("crypto")

let cachedPlayers

const sessionChecker = (req, res, next) => {
    if (req.session && req.session.userId) {
        // session exists
        next();
    } else {
        // session doesn't exist or has expired, redirect to login page
        res.redirect('/pages/login');
    }
}

async function cachePlayers(){
    try{
        cachedPlayers = await axios.get(nbaURL)
    } catch(e){
        console.log(e)
    }
}

// schedule.scheduleJob("* * * * *", async () => {
schedule.scheduleJob("0 0 12 * * *", async () => {
    let date = new Date(Date.now()).toISOString().split("T")[0]
    let games = await axios.get(`${URL}/games?seasons[]=2022&start_date=${date.toString()}&end_date=${date.toString()}`)
    let i = 0
    await games.data.data.forEach(async (game) => {
        let home = game.home_team.name
        let visitors = game.visitor_team.name
        let homeTeams = await Team.find({"players.team.name": home})
        let visitingTeams = await Team.find({"players.team.name": visitors})
        if(homeTeams.length !==0){
            i += 1
            let player = homeTeams[0].players.find(player => player.team.name == home)
            if(i % 11 === 0){
                sleep(7000)
            }
            player.score = await calculateScore(player.id)
        } 
        if(visitingTeams.length !== 0){
            i += 1
            let player = visitingTeams[0].players.find(player => player.team.name == visitors)
            if(i % 11 === 0){
                sleep(7000)
            }
            player.score = await calculateScore(player.id)
        }
    })
    console.log("Scores updated")
})

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
    user.password = req.body.password
    user.passwordResetToken = null
    req.session.userId = user._id.toString()
    req.session.isAdmin = false
    req.session.username = user.username
    try{
        if(req.body.password === req.body.confirmPassword){
            await user.save()
            res.redirect(`/pages/dashboard`)
        } else {
            throw new Error("Passwords don't match")
        }
    } catch (e){
        console.log(e)
        res.redirect("/pages/register")
    }
})

// login
router.get("/login", (req, res) => {
    if(req.query.error === "true"){
        res.render("pages/login", {error: true})
    } else {
        res.render("pages/login", {error: false})
    }
})

// login POST
router.post("/users/login", async (req, res) => {
    let user
    try{
        user = await User.findOne({username: req.body.username})
        const result = await user.comparePassword(req.body.password)
        if(result == true){
            req.session.userId = user._id.toString()
            req.session.isAdmin = false
            req.session.username = user.username
            res.redirect('/pages/dashboard')
        } else {
            throw new Error("Incorrect username or password")
        }
    } catch (e){
        console.log(e)
        res.redirect("/pages/login?error=true")
    }
})

// Sign out POST
router.post("/sign-out", async(req, res) => {
    req.session.destroy((e) => {
        if(e) console.log(e)
        else res.redirect("/")
    })
})

// Forgot password
router.get("/forgot-password", (req, res) => {
    res.render("pages/forgotPassword", {
        emailSent: false
    })
})

// Forgot password POST
// Reset password POST
router.post("/forgot-password", async(req, res) => {
    let user = await User.findOne({email: req.body.email})
    if(user !== null){
        let transporter = nodemailer.createTransport({
            service: "gmail",
            host: "smtp.gmail.com",
            secure: true,
            auth: {
                user: "nbafantasygames@gmail.com",
                pass: "njoxwfrteifpadav"
            }
        });
        let uuid = crypto.randomUUID()
        let mailURL = `${process.env.URL}/api/reset-password/${uuid}`
        await transporter.sendMail({
            from: "nbafantasygames@gmail.com", // sender address
            to: user.email, // list of receivers
            subject: "Reset password", // Subject line
            text: `Use this link to reset your password: ${mailURL} \nThis link will expire in 15 minutes. \n \nDidn't exepct to receive this email? Don't worry, you can just ignore this email.`, // plain text body
        });
        user.passwordResetToken = {
            token: uuid,
            timestamp: Date.now()
        }
        try{
            await user.save()
        } catch(e){
            console.log(e)
        }
        res.render("pages/forgotPassword", {
            emailSent: true,
            sentSucces: true
        })
    } else {
        res.render("pages/forgotPassword", {
            emailSent: true,
            sentSucces: false
        })
    }
})

// dashboard
router.get("/dashboard", sessionChecker, sessionChecker, async(req, res) => {
    let user = await User.findById(req.session.userId)
    let changelog = await Changelog.find().limit(15).exec()
    let leagues = await League.find({users: {$elemMatch: {id: req.session.userId}}}).limit(20).exec()
    leagues.forEach(league => {
        league.users.sort(function(a, b){
            return b.teamScore - a.teamScore
        })
    })
    res.render("pages/dashboard", {
        userId: req.session.userId, 
        leagues: leagues,
        changelog: changelog,
        hasSeenChangelog: user.hasSeenChangelog,
        URL: process.env.URL,
        username: req.session.username,
        notifications: user.notifications,
        hasNotifications: checkNotifications(user)
    })
})

// Change hasSeenChange state POST
router.post("/dashboard/hasSeenChange/:userId", sessionChecker, async(req, res) => {
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
router.post("/search-user", sessionChecker, async(req, res) => {
    if(req.query.leagueInvite == "true"){
        res.redirect(`/pages/search-user/${req.body.searchUser}?leagueInvite=true&leagueId=${req.query.leagueId}`)
    } else {
        res.redirect(`/pages/search-user/${req.body.searchUser}`)
    }
})

// search user results
router.get("/search-user/:searchUser", sessionChecker, async(req, res) => {
    let users = await User.find({username: {$regex: req.params.searchUser, $options: "i"}})
    let user = await User.findById(req.session.userId)
    let isInvite = false
    if(req.query.leagueInvite == "true"){
        isInvite = true
    }
    res.render("pages/searchResults", {
        users: users,
        type: "user",
        search: req.params.searchUser,
        loggedIn: true,
        currentUser: user,
        username: req.session.username,
        notifications: user.notifications,
        hasNotifications: checkNotifications(user),
        isInvite: isInvite,
        leagueId: req.query.leagueId
    })
})

// add friend POST
// Send friend request POST
router.post("/friends/:friendId/add", sessionChecker, async (req, res) => {
    let user = await User.findById(req.session.userId)
    let friend = await User.findById(req.params.friendId)
    try{
        if(user.friendRequestsSent.filter(request => request.username == friend.username).length == 0 && user.friends.filter(friend => friend.id == req.params.friendId).length == 0){
            let sentRequestTo = {
                username: friend.username,
                id: friend._id.toString(),
                date: Date.now()
            }   
            let dataToSend = {
                username: user.username,
                id: user._id.toString(),
                date: Date.now()
            }
            user.friendRequestsSent.push(sentRequestTo)
            friend.friendRequestsReceived.push(dataToSend)
            let notification = {
                type: 1,
                data: dataToSend
            }
            friend.notifications.push(notification)
        } else {
            throw new Error("A request has already been sent")
        }
        await user.save()
        await friend.save()
    } catch(e){
        console.log(e)
    }
    if(req.query.redirect == "search"){
        res.redirect(`/pages/search-user/${req.query.search}`)
    } else {
        res.redirect(`/pages/dashboard`)
    }
})

// Accept friend request POST
router.post("/friends/:friendId/accept", sessionChecker, async(req, res) => {
    let user = await User.findById(req.session.userId)
    let friend = await User.findById(req.params.friendId)
    let dataToSend = {
        username: friend.username,
        id: friend._id.toString()
    }
    let sent = {
        username: user.username,
        id: user._id.toString()
    }

    let indexOfRequest = user.friendRequestsReceived.findIndex(request => request.id == friend._id)
    user.friendRequestsReceived.splice(indexOfRequest, 1)

    let indexOfSent = friend.friendRequestsSent.findIndex(request => request.id == user._id)
    friend.friendRequestsSent.splice(indexOfSent, 1)

    dataToSend.date = Date.now()
    user.friends.push(dataToSend)

    sent.date = Date.now()
    friend.friends.push(sent)

    let notificationIndex = user.notifications.findIndex(notif => notif.data.id == friend._id.toString())
    user.notifications.splice(notificationIndex, 1)

    let notification = {
        type: 2,
        userId: user._id.toString(),
        username: user.username,
        date: Date.now()
    }
    friend.notifications.push(notification)

    try{
        await user.save()
        friend.markModified("notifications")
        await friend.save()
    } catch (e){
        console.log(e)
    }
    if(req.query.fromNotif == "true"){
        res.redirect("back")
    } else {
        res.redirect(`/pages/profile`)
    }
})

// Reject friend request POST
router.post("/friends/:friendId/reject", sessionChecker, async(req, res) => {
    let user = await User.findById(req.session.userId)
    let friend = await User.findById(req.params.friendId)

    let indexOfRequest = user.friendRequestsReceived.findIndex(request => request.id == friend._id)
    user.friendRequestsReceived.splice(indexOfRequest, 1)

    let indexOfSent = friend.friendRequestsSent.findIndex(request => request.id == user._id)
    friend.friendRequestsSent.splice(indexOfSent, 1)

    let notificationIndex = user.notifications.findIndex(notif => notif.data.id == friend._id.toString())
    user.notifications.splice(notificationIndex, 1)

    try{
        await user.save()
        await friend.save()
    } catch (e){
        console.log(e)
    }
    if(req.query.fromNotif == "true"){
        res.redirect("back")
    } else {
        res.redirect(`/pages/profile`)
    }
})

// Remove friend POST
router.post("/friends/:friendId/remove", sessionChecker, async (req, res) => {
    let user = await User.findById(req.session.userId)
    let friend = await User.findById(req.params.friendId)

    let index = user.friends.findIndex(friend => friend.id == req.params.friendId)
    user.friends.splice(index, 1)

    let friendIndex = friend.friends.findIndex(friend => friend.id == req.session.userId)
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
router.post("/friends/:requestId/undo", sessionChecker, async (req, res) => {
    let user = await User.findById(req.session.userId)
    let friend = await User.findById(req.params.requestId)

    let userIndex = friend.friendRequestsReceived.findIndex(request => request.id == req.session.userId)
    friend.friendRequestsReceived.splice(userIndex, 1)

    let friendIndex = user.friendRequestsSent.findIndex(request => request.id == req.params.requestId)
    user.friendRequestsSent.splice(friendIndex, 1)

    let notifIndex = friend.notifications.findIndex(notification => notification.data.id == req.session.userId)
    friend.notifications.splice(notifIndex, 1)

    try{
        await user.save()
        friend.markModified("notifications")
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
router.get("/profile", sessionChecker, async (req, res) => {
    let user = await User.findById(req.session.userId)
    if(user !== null){
        res.render("pages/profile", {
            user: user, 
            username: user.username,
            notifications: user.notifications,
            hasNotifications: checkNotifications(user)
        })
    } else {
        res.redirect("/")
    }
})

// view other profile
router.get("/view-profile/:otherUser", sessionChecker, async(req, res) => {
    let user = await User.findById(req.params.otherUser)
    let currentUser = await User.findById(req.session.userId)
    let teams = await Team.find({userId: user._id.toString()})
    teams.sort((a, b) => {
        b.teamScore - a.teamScore
    })
    res.render("pages/viewProfile", {
        user: user,
        currentUser: currentUser,
        username: user.username,
        teams: teams,
        notifications: currentUser.notifications,
        hasNotifications: checkNotifications(currentUser)
    })
})

// search
router.post("/players/search", sessionChecker, async(req, res) => {
    let request = await axios.get(`${URL}/players?search=${req.body.search}`)
    let user = await User.findById(req.session.userId)
    res.render("pages/searchResults", {
        search: req.body.search, 
        results: request.data.data,
        loggedIn: false,
        type: "player",
        username: req.session.username,
        notifications: user.notifications,
        hasNotifications: checkNotifications(user)
    })
})

// player info
router.get("/players/:id", sessionChecker, async (req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.id}`)
    let stats = await axios.get(`${URL}/season_averages?player_ids[]=${req.params.id}`)
    let allPlayers = await axios.get(nbaURL)
    let nbaPlayer = allPlayers.data.league.standard.find(firstName => firstName.firstName == player.data.first_name, lastName => lastName.lastName == player.data.last_name)
    let score = await calculateScore(req.params.id, stats.data.data[0])
    let user = await User.findById(req.session.userId)
    let loggedIn = false
    if(req.session.userId){
        loggedIn = true
    }
    res.render("pages/playerDetails", {
        player: player.data,
        stats: stats.data.data[0],
        personId: nbaPlayer.personId,
        loggedIn: loggedIn,
        username: req.session.username,
        score: score,
        notifications: user.notifications,
        hasNotifications: checkNotifications(user)
    })
})

// add player to team POST
// Create team POST
router.post("/teams/leagues/:leagueId/add/players/:playerId/position/:position", sessionChecker, async (req, res) => {
    let user = await User.findById(req.session.userId)
    let league = await League.findById(req.params.leagueId)
    let player = await axios.get(`${URL}/players/${req.params.playerId}`)
    let userIndex = league.users.findIndex(user => user.id == req.session.userId)
    let team
    if(league.users[userIndex].teamId === null){
        team = new Team()
        team.league = {
            id: req.params.leagueId,
            name: league.name
        }
        team.userId = req.session.userId
        league.users[userIndex].teamId = team._id.toString()
    } else {
        team = await Team.findById(league.users[userIndex].teamId)
    }
    try{
        if(team.players.find(player => player.id == req.params.playerId) == undefined && team.players.length <= 5 ){
            let index = team.players.findIndex(player => player.position == req.params.position)
            if(index !== -1){
                team.players.splice(index, 1)
            }
            player.data.position = req.params.position
            player.data.full_name = player.data.first_name + " " + player.data.last_name
            player.data.score = await calculateScore(player.data.id)
            team.players.push(player.data)
        } else {
            throw new Error("This player already on this team.")
        }
        league.markModified("users")
        league.users[userIndex].teamScore = await addScores(team)
        team.markModified("players")
        await league.save()
        await team.save()
        res.json({message: "all good", status: 200})
    } catch(e){
        console.log(e)
        res.json({message: "error, check terminal", status: 406})
    }
})

// create new team
router.get("/leagues/:leagueId/teams/create", sessionChecker, async (req, res) => {
    let user = await User.findById(req.session.userId)
    let league = await League.findById(req.params.leagueId)
    res.cookie("currentSession", req.sessionID, {
        sameSite:"lax"
    })
    cachePlayers()
    let team = null
    try{
        let userId = league.users.findIndex(user => user.id == req.session.userId)
        team = await Team.findById(league.users[userId].teamId)
    } catch(e){
        console.log(e)
    }
    res.render("pages/createTeam", {
        url: process.env.URL, 
        leagueId: req.params.leagueId,
        username: req.session.username,
        notifications: user.notifications,
        hasNotifications: checkNotifications(user),
        team: team
    })
})

// Find personId
router.get("/teams/findPerson/:firstName/:lastName", async(req, res) => {
    try{
        let personId = cachedPlayers.data.league.standard.find(player => player.firstName.toUpperCase() == req.params.firstName.toUpperCase() && player.lastName.toUpperCase() == req.params.lastName.toUpperCase())
        res.send({personId: personId.personId})
    } catch(e){
        res.send({personId: null})
    }
})

// delete team POST
router.post("/leagues/:leagueId/teams/:id/delete", sessionChecker, async(req, res) => {
    await Team.findByIdAndDelete(req.params.id)
    let league = await League.findById(req.params.leagueId)
    let index = league.users.findIndex(user => user.teamId == req.params.id)
    try{
        league.users[index].teamId = null
        league.users[index].teamScore = null
        league.markModified("users")
        await league.save()
    } catch (e) {
        console.log(e)
    }
    res.redirect(`/pages/teams/show`)
})

// show all teams
router.get("/teams/show", sessionChecker, async(req, res) => {
    let teams = await Team.find({userId: req.session.userId})
    let user = await User.findById(req.session.userId)
    res.render("pages/showTeams", {
        teams: teams, 
        username: req.session.username,
        notifications: user.notifications,
        hasNotifications: checkNotifications(user)
    })
})

// view team
router.get("/leagues/:leagueId/teams/:id/view", sessionChecker, async(req, res) => {
    let team = await Team.findById(req.params.id)
    let url = process.env.URL
    let user = await User.findById(req.session.userId)
    if(req.session.userId == team.userId){
        res.render("pages/team", {
            team: team, 
            url: url, 
            leagueId: req.params.leagueId,
            username: req.session.username,
            notifications: user.notifications,
            hasNotifications: checkNotifications(user)
        })
    } else {
        res.redirect(`/pages/leagues/${req.params.leagueId}/teams/${req.params.id}/view-other`)
    }
})

// view other team
router.get("/leagues/:leagueId/teams/:id/view-other", sessionChecker, async(req, res) => {
    let team = await Team.findById(req.params.id)
    let user = await User.findById(req.session.userId)
    let url = process.env.URL
    let params = {
        team: team,
        userId: req.session.userId,
        leagueId: req.params.leagueId,
        url: url,
        username: req.session.username,
        notifications: user.notifications,
        hasNotifications: checkNotifications(user)
    }
    if(req.session.userId == team.userId){
        res.render("pages/team", params)
    } else {
        res.render("pages/viewOtherTeam", params)
    }
})

// view player when logged in
router.get("/players/:playerId", sessionChecker, async(req, res) => {
    let user = await User.findById(req.session.userId)
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
        username: req.session.username,
        notifications: user.notifications,
        hasNotifications: checkNotifications(user)
    })
})

// Create league
router.get("/leagues/create", sessionChecker, async (req, res) => {
    let user = await User.findById(req.session.userId)
    res.render("pages/createLeague", {
        username: req.session.username,
        notifications: user.notifications,
        hasNotifications: checkNotifications(user)
    })
})

// Create league POST
router.post("/leagues/create", sessionChecker, async (req, res) => {
    let user = await User.findById(req.session.userId)
    let userData = {
        username: user.username,
        id: req.session.userId,
        date: Date.now(),
        teamId: null,
        isOwner: true
    }
    let league = new League()
    league.name = req.body.name
    league.users.push(userData)
    league.public = req.body.public
    league.maxUsers = req.body.maxUsers
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
router.get("/leagues/:leagueId", sessionChecker, async (req, res) => {
    let league = await League.findById(req.params.leagueId)
    let teams = await Team.find({"league.id": req.params.leagueId})
    let user = await User.findById(req.session.userId)
    let isJoined = false
    let hasTeam = false
    let hasRequested = false
    let isMax = false
    let userIndex
    let hasNotifications = false
    if(user.notifications.length !== 0) hasNotifications = true
    if(league.users.findIndex(element => element.id == req.session.userId) != -1){
        isJoined = true
        userIndex = league.users.findIndex(element => element.id == req.session.userId)
        if(league.users[userIndex].teamId != null){
            hasTeam = true
        }
    }
    if(league.requests.findIndex(request => request.id == req.session.userId) != -1){
        hasRequested = true
    }
    league.users.sort(function(a, b){
        return b.teamScore - a.teamScore
    })
    if(league.users.length >= 50){
        isMax = true
    }
    res.render("pages/showLeague", {
        league: league, 
        isJoined: isJoined,
        hasTeam: hasTeam,
        teams: teams,
        username: req.session.username,
        hasRequested: hasRequested,
        isMax: isMax,
        notifications: user.notifications,
        hasNotifications: hasNotifications
    })
})

// view all leagues
router.get("/leagues", sessionChecker, async(req, res) => {
    let leagues = await League.find({public: true}).limit(30).exec()
    let user = await User.findById(req.session.userId)
    leagues.forEach(league => {
        league.usersAmount = league.users.length
    })
    // let leagues = await League.find({public: true})
    res.render("pages/allLeagues", {
        leagues: leagues,
        username: req.session.username,
        notifications: user.notifications,
        hasNotifications: checkNotifications(user)
    })
})

// Search league POST
router.post("/leagues/search", sessionChecker, async(req, res) => {
    let leagues = await League.find({name: {$regex: req.body.league, $options: "i"}})
    res.render("pages/searchResults", {
        type: "league",
        leagues: leagues,
        search: req.body.league,
        loggedIn: true,
        username: req.session.username
    })
})

// request to join league POST
router.post("/leagues/:leagueId/join", sessionChecker, async (req, res) => {
    let league = await League.findById(req.params.leagueId)
    let user = await User.findById(req.session.userId)
    if(league.users.length < 50){
        let dataToSend = {
            username: user.username,
            id: req.session.userId,
            date: Date.now()
        }
        league.requests.push(dataToSend)
    }
    try{
        await league.save()
    } catch (e){
        console.log(e)
    }
    res.redirect(`/pages/leagues/${req.params.leagueId}`)
})

// Send league invite POST
// Invite user to league POST
// Send invite
router.post("/leagues/:leagueId/user/:userId/invite", sessionChecker ,async(req, res) => {
    let league = await League.findById(req.params.leagueId)
    let user = await User.findById(req.params.userId)
    let currentUser = await User.findById(req.session.userId)
    let invite = {
        leagueId: req.params.leagueId,
        leagueName: league.name,
        from: req.session.userId,
        to: req.params.userId,
        date: Date.now(),
    }
    let notification = {
        type: 3,
        leagueName: league.name,
        leagueId: league._id.toString(),
        from: currentUser.username,
        fromId: currentUser._id.toString()
    }

    user.notifications.push(notification)
    user.leagueInvites.push(invite)
    league.invitesSent.push(invite)

    try{
        user.markModified("notifications")
        user.markModified("leagueInvites")
        league.markModified("invitesSent")
        await user.save()
        await league.save()
        res.redirect("back")
    } catch(e){
        console.log(e)
        res.redirect("/error")
    }
})

// Accept league invite POSt
// Accept invite
router.post("/leagues/:leagueId/invite/accept/user/:userId", async(req, res) => {
    let user = await User.findById(req.session.userId)
    let league = await League.findById(req.params.leagueId)
    let receipiant = await User.findById(req.params.userId)
    let leagueData = {
        username: user.username,
        id: user._id.toString(),
        date: Date.now(),
        teamId: null,
        isOwner: false
    }
    let userData = {
        id: league._id.toString(),
        name: league.name
    }
    let notification = {
        type: 4,
        userId: user._id.toString(),
        username: user.username,
        date: Date.now(),
        leagueName: league.name,
        leagueId: league._id.toString()
    }

    league.users.push(leagueData)
    user.leagues.push(userData)
    receipiant.notifications.push(notification)

    let inviteIndex = user.leagueInvites.findIndex(invite => invite.leagueId == league._id.toString())
    user.leagueInvites.splice(inviteIndex, 1)

    let leagueInviteIndex = league.invitesSent.findIndex(invite => invite.to == user._id.toString())
    league.invitesSent.splice(leagueInviteIndex, 1)

    let notificationIndex = user.notifications.findIndex(notification => notification.leagueId == req.params.leagueId)
    user.notifications.splice(notificationIndex, 1)

    try{
        await league.save()
        await user.save()
        await receipiant.save()
        res.redirect("back")
    } catch(e){
        console.log(e)
        res.redirect("/error")
    }
})

// Reject league invite POST
router.post("/leagues/:leagueId/invite/reject", async(req, res) => {
    let user = await User.findById(req.session.userId)
    let league = await League.findById(req.params.leagueId)

    let inviteIndex = user.leagueInvites.findIndex(invite => invite.leagueId == league._id.toString())
    user.leagueInvites.splice(inviteIndex, 1)

    let leagueInviteIndex = league.invitesSent.findIndex(invite => invite.to == user._id.toString())
    league.invitesSent.splice(leagueInviteIndex, 1)

    let notificationIndex = user.notifications.findIndex(notification => notification.leagueId == req.params.leagueId)
    user.notifications.splice(notificationIndex, 1)

    try{
        await user.save()
        await league.save()
        res.redirect("back")
    } catch(e){
        console.log(e)
        res.redirect("/error")
    }
})

// league settings
router.get("/leagues/:leagueId/settings", sessionChecker, async (req, res) => {
    let league = await League.findById(req.params.leagueId)
    let user = await User.findById(req.session.userId)
    res.render("pages/leagueSettings", {
        league: league,
        username: req.session.username,
        userId: req.session.userId,
        notifications: user.notifications,
        hasNotifications: checkNotifications(user)
    })
})

// Leave league POST
router.post("/leagues/:leagueId/leave", sessionChecker, async (req, res) => {
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

// Delete league POST
router.post("/leagues/:leagueId/delete", sessionChecker, async(req, res) => {
    try{
        let league = await League.findById(req.params.leagueId)
        let user = await User.findById(req.session.userId)
        let team = await Team.findById(league.users[0].teamId)
        if(team != null){
            team.league = null
            await team.save()
        }
        user.leagues.splice(user.leagues.findIndex(league => league.id == req.params.leagueId), 1)
        await league.delete()
        user.markModified("leagues")
        await user.save()
        res.redirect("/pages/dashboard")
    } catch(e){
        console.log(e)
        res.redirect("/error")
    }
})

// Accept request to join league POST
router.post("/leagues/:leagueId/request/:requestId/accept", sessionChecker, async (req, res) => {
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

// Reject request to join league POST
router.post("/leagues/:leagueId/request/:requestId/reject", sessionChecker, async (req, res) => {
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

// recalculate team score POST
router.post("/league/:leagueId/teams/:teamId/calculateScore", sessionChecker, async(req, res) => {
    let team = await Team.findById(req.params.teamId)
    let league = await League.findById(req.params.leagueId)
    let index = league.users.findIndex(user => user.id == req.session.userId)
    league.users[index].teamScore = await addScores(team)
    try{
        await team.save()
        league.markModified("users")
        await league.save()
    } catch(e){
        console.log(e)
    }
    res.redirect(`/pages/leagues/${req.params.leagueId}/teams/${req.params.teamId}/view`)
})

// Remove all notifications POST
router.post("/notifications/delete-all", sessionChecker, async(req, res) => {
    let user = await User.findById(req.session.userId)
    user.notifications = []
    try{
        await user.save()
        res.redirect("back")
    } catch(e){
        console.log(e)
        res.redirect("/error")
    }
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
    let scoreData = parseInt(score)
    return scoreData
}

async function addScores(team){
    try{
        let teamScore = 0
        team.players.forEach(async (player) => {
            teamScore += player.score
        })
        team.teamScore = teamScore
        return teamScore
    } catch (e){
        console.log(e)
    }
}

async function updateScores(team){
    try{
        team.players.forEach(async (player) => {
            player.score = await calculateScore(player.id)
        })
    } catch(e){
        console.log(e)
    }
}

function checkNotifications(user){
    let hasNotifications = false
    if(user.notifications.length !== 0){
        hasNotifications = true
    }
    return hasNotifications
}

module.exports = {
    router: router
}