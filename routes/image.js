const moment = require('moment-timezone')
const express = require('express');
const toml = require('toml')
const { v4: uuidv4 } = require('uuid')
var router = express.Router()

router.post('/', (req, res) => {
    try {
        var db = req.app.locals.db
        var image_config = toml.parse(req.params.config)
        var image = {}
        image.$id = uuidv4()
        image.$name = image_config.name
        image.$duration = image_config.duration
        var rules = image_config.rules
        var total_pts = 0
        rules.forEach((rule) => {
            rule.$id = uuidv4()
            rule.$image_id = image.id
            rule.$rule_name = rule.name
            rule.$points = typeof rule.pts == 'number'? rule.pts : 0
            if (rule.$points > 0)
                total_pts += rule.$points
            rule.$command = typeof rule.cmd == 'string'? rule.cmd : 'false'
            rule.$exit_code = typeof rule.code == 'number'? rule.code : 0
        })
        if (total_pts != 100) {
            res.status(400).json({success: false, message: 'Maximum score is not 100'})
        }
        db.serialize(() => {
            db.run('INSERT INTO image VALUES ($id,$name,$duration)', image)
            db.run('INSERT INTO rules VALUES ($id,$image_id,$rule_name,$points,$command,$exit_code)', rules)
        })
        res.json({success: true, message: `New image created (ID: ${image.id})`})
    } catch (err) {
        res.status(500).json({success: false, message: err.message})
    }
})