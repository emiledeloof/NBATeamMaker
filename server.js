if(process.env.NODE_ENV !== "production"){
  require("dotenv").config();
}

const express = require("express")
const mongoose = require("mongoose")
const cookieParser = require("cookie-parser")
const sessions = require("express-session")
const crypto = require("crypto")
const uuid = require("node-uuid")
const MongoDBStore = require('connect-mongodb-session')(sessions);
const cors = require("cors")
const router = require("./routes/router")
const backRouter = require("./routes/backRouter")
const app = express()
const PORT = process.env.PORT || 5001
const HOUR = 1000 * 60 * 60

mongoose.connect("mongodb+srv://admin:admin@cluster0.licu4m5.mongodb.net/?retryWrites=true&w=majority")

const store = new MongoDBStore({
    uri: "mongodb+srv://admin:admin@cluster0.licu4m5.mongodb.net/?retryWrites=true&w=majority",
    collection: 'sessions',
    expires: HOUR
});

app.use('/robots.txt', function (req, res, next) {
    res.type('text/plain')
    res.send("User-agent: *\nAllow: /");
});

app.use(cors({
    origin: "https://nbafantasy.games",
    credentials: true
}))

app.use(cookieParser())
app.set("view engine", "ejs")
app.set("trust proxy", 1)
app.use(express.static("style"))
app.use(express.static("statics"))
app.use(express.static("scripts"))
app.use(express.urlencoded({ extended: false }));
app.use(new sessions({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    unset: 'destroy',
    store: store,
    cookie: {
        maxAge: HOUR,
    },
    genid: (req) => {
        return crypto.createHash('sha256').update(uuid.v1()).update(crypto.randomBytes(256)).digest("hex");
    }
}));

app.get("/", (req, res) => {
    if(req.session.userId){
        res.render("pages/index", {loggedIn: true, username: req.session.username})
    } else {
        res.render("pages/index", {loggedIn: false})
    }
})

app.use("/pages", router)
app.use("/back", backRouter)

app.all("*", (req, res) => {
    try{
        if(req.session.userId){
            res.render("pages/error", {loggedIn: true, username: req.session.username})
        } else{
            res.render("pages/error", {loggedIn: false})
        }
    } catch(e){
        res.redirect("/")
    }
})

app.listen(PORT, () => {console.log("Listening on port " + PORT)})