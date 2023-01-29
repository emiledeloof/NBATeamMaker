const express = require("express")
const router = express.Router();
const axios = require("axios")
const URL = "https://www.balldontlie.io/api/v1"

router.post("/search", async(req, res) => {
    let request = await axios.get(`${URL}/players?search=${req.body.search}`)
    if(Array.isArray(request.data) == false){
        request.data = [request.data]
    }
    res.render("pages/searchResults", {search: req.body.search, results: request.data})
})

router.get("/players/:id", async (req, res) => {
    let player = await axios.get(`${URL}/players/${req.params.id}`)
    res.render("pages/playerDetails", {
        player: player.data
    })
})

module.exports = router