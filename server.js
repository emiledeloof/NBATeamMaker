const express = require("express")
const mongoose = require("mongoose")
const router = require("./routes/router")
const app = express()
const PORT = 5001

mongoose.connect("mongodb://localhost:27017/NBA")

app.set("view engine", "ejs")
app.use(express.static("style"))
app.use(express.urlencoded({ extended: false }));

app.get("/", (req, res) => {
    res.render("pages/index")
    // res.redirect("pages/teams")
})

app.use("/pages", router)

app.listen(PORT, () => {console.log("Listening on port " + PORT)})