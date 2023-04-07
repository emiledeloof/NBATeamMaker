const express = require("express")
const router = express.Router()
const types = require("./../types")

router.get("/types/notifications", (req, res) => {
    res.send(types.notificationTypes)
})

module.exports = router