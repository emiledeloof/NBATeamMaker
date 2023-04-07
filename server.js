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
const apiRouter = require("./routes/apiRouter");
const User = require("./database/user")
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

app.get('/sitemap.xml', (req, res) => {
    const baseUrl = 'https://nbafantasy.games';
    const pages = [
      { url: '/', priority: 1.0 },
      { url: '/pages/login', priority: 0.8 },
      { url: '/pages/register', priority: 0.8 },
    ];
  
    let xml = '<?xml version="1.0" encoding="UTF-8"?>';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
  
    for (const page of pages) {
      xml += '<url>';
      xml += `<loc>${baseUrl}${page.url}</loc>`;
      xml += `<changefreq>${page.changefreq}</changefreq>`;
      xml += `<priority>${page.priority}</priority>`;
      xml += '</url>';
    }
  
    xml += '</urlset>';
  
    res.header('Content-Type', 'application/xml');
    res.send(xml);
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
// app.use(checkSession)

app.get("/", async (req, res) => {
    if(req.session.userId){
        let user = await User.findById(req.session.userId)
        res.render("pages/index", {
            loggedIn: true, 
            username: req.session.username,
            notifications: user.notifications,
            hasNotifications: checkNotifications(user)
        })
    } else {
        res.render("pages/index", {loggedIn: false})
    }
})

function checkNotifications(user){
    let hasNotifications = false
    if(user.notifications.length !== 0){
        hasNotifications = true
    }
    return hasNotifications
}

app.use("/pages", router)
app.use("/back", backRouter)
app.use("/api", apiRouter)

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