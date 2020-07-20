var express = require('express')
var router = express.Router()

// welcome message
router.get('/', function(_req, res) {
    res.json({success: true, message: "Welcome to imsc scoring server"})
});

module.exports = router
