const createError = require('http-errors')
const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const http = require('http')
const sqlite3 = require('sqlite3').verbose()
var db = new sqlite3.Database(path.join(__dirname, 'database.db'))

var app = express()
app.locals.db = db

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(logger('combined'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(bodyParser.text())
app.use(cookieParser())

app.use(express.static(path.join(__dirname, 'public')))
//app.use(express.static(__dirname, { dotfiles: 'allow' } )) // for Certbot challenge

app.use('/', require('./routes/index'))
app.use('/session', require('./routes/session'))
app.use('/image', require('./routes/image'))

// catch 404 and forward to error handler
app.use((_req, _res, next) => next(createError(404)))

// error handler
app.use((err, _req, res) =>
    res.status(err.status || 500).json({success: false, message: err.message})
)

if (process.env.DEBUG === 'true') {
    http.createServer(app).listen(80, () => {
        console.log('(DEBUG) Scoing server running on port 80')
    })
} else {
    const fs = require('fs')
    const https = require('https')

    // redirect HTTP to HTTPS server
    app.use((req, res, next) => {
        if(!req.secure) {
            return res.redirect(['https://', req.get('Host'), req.url].join(''))
        }
        next()
    })

    // Set up SSL/TLS Certificate
    const imsc_server = process.env.IMSC_SERVER // Server URL
    const privkey = fs.readFileSync(`/etc/letsencrypt/live/${imsc_server}/privkey.pem`, 'utf8')
    const certificate = fs.readFileSync(`/etc/letsencrypt/live/${imsc_server}/cert.pem`, 'utf8')
    const ca = fs.readFileSync(`/etc/letsencrypt/live/${imsc_server}/chain.pem`, 'utf8')
    const credentials = {
        key: privkey,
        cert: certificate,
        ca: ca
    };

    const https_server = https.createServer(credentials, app)
    https_server.listen(443, () => {
        console.log('Scoring server running on port 443')
    })

    http.createServer(app).listen(80)
}
