if(process.env.NODE_ENV !== "production"){
  require("dotenv").config();
}

const express = require("express")
const mongoose = require("mongoose")
const cookieParser = require("cookie-parser")
const sessions = require("express-session")
const router = require("./routes/router")
const app = express()
const PORT = process.env.PORT || 5001
const day = 1000*60*60*24

mongoose.connect("mongodb+srv://admin:admin@cluster0.licu4m5.mongodb.net/?retryWrites=true&w=majority")

app.set("view engine", "ejs")
app.use(express.static("style"))
app.use(express.static("statics"))
app.use(express.static("scripts"))
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser())
app.use(sessions({
    secret: "secret",
    saveUninitialized: true,
    cookie: { maxAge: day },
    resave: false
}))
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

app.get("/", (req, res) => {
    res.render("pages/index")
    // res.redirect("pages/teams")
})

app.use("/pages", router)

app.listen(PORT, () => {console.log("Listening on port " + PORT)})