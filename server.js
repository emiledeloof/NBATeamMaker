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
const router = require("./routes/router")
const app = express()
const PORT = process.env.PORT || 5001
const day = 1000*60*60*24

mongoose.connect("mongodb+srv://admin:admin@cluster0.licu4m5.mongodb.net/?retryWrites=true&w=majority")

const store = new MongoDBStore({
    uri: "mongodb+srv://admin:admin@cluster0.licu4m5.mongodb.net/?retryWrites=true&w=majority",
    collection: 'sessions'
});

app.set("view engine", "ejs")
app.use(express.static("style"))
app.use(express.static("statics"))
app.use(express.static("scripts"))
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser())
app.use(new sessions({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    unset: 'destroy',
    store: store,
    genid: (req) => {
        return crypto.createHash('sha256').update(uuid.v1()).update(crypto.randomBytes(256)).digest("hex");
    },
    cookie: {
        maxAge: 60*100*24
    }
}));

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