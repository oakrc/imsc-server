const moment = require('moment-timezone')
const express = require('express');
const crypto = require('crypto')
var router = express.Router();

const empty_report = '{"pts":0,"vulns":[],"penalties":[]}'

const imsc_key_str = process.env.IMSC_KEY
var sha256sum = crypto.createHash('sha256')
sha256sum.update(imsc_key_str)
const imsc_key = sha256sum.digest()
const algorithm = 'aes-256-cfb'

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, imsc_key, iv);
  let enc = [iv, cipher.update(text, 'utf8')];
  enc.push(cipher.final());
  return Buffer.concat(enc).toString('base64');
}

function decrypt(text) {
  const contents = Buffer.from(text, 'base64');
  const iv = contents.slice(0, 16);
  const text_bytes = contents.slice(16);
  const decipher = crypto.createDecipheriv(algorithm, imsc_key, iv);
  let res = decipher.update(text_bytes, '', 'utf8');
  res += decipher.final('utf8');
  return res;
}
// hardcoding it since I'm only using it for the club
const format_moment = (m) => m.tz('America/Los_Angeles').format('YYYY-MM-DD HH:mm:ss z')

const fetch_session_info = () => {
    return (req, res, next) => {
        var token = req.params.token
        if (!token) {
            res.status(400).json({success: false, message: "Empty token"})
            return
        }
        db = req.app.locals.db
        db.get("SELECT * FROM sessions WHERE token = ? AND start_time IS NOT NULL AND start_time <= datetime('now')", token,
               (err, session) => {
                   if (err) {
                       res.status(500).json({sucess: false, message: err.message})
                       return
                   }

                   if (!session) {
                       res.status(400).json({success: false, message: "Token not found or session inactive."})
                       return
                   }

                   db.get("SELECT * FROM images WHERE id = ?", session.image_id,
                          (err, image) => {
                              if (err) {
                                  res.status(500).json({sucess: false, message: err.message})
                                  return
                              }
                              if (!image) {
                                  res.status(404).json({success: false, message: "Image not found"})
                                  return
                              }

                              end_time = moment.utc(session.start_time).add(image.duration, 'm').toDate()

                              session.end_time = end_time
                              session.start_time = moment.utc(session.start_time).toDate()
                              session.last_scored = moment.utc(session.last_scored || '0000-01-01').toDate()

                              if (session.end_time < new Date() || session.stopped) {
                                  session.status = 'Termination'
                              } else if (moment(session.last_scored).add(1, 'm').toDate() < new Date()) {
                                  session.status = 'Score'
                              } else {
                                  session.status = 'Wait'
                              }

                              res.locals.image = image
                              res.locals.session = session

                              next()
                          })
               })
    }
}

const ensure_active_session = () => {
    return (_req, res, next) => {
        if (res.locals.session.end_time <= new Date()) {
            res.status(403).json({success: false, message: "Token expired"})
            return
        }
        if (res.locals.session.stopped == true) {
            res.status(403).json({success: false, message: "Token expired. Session was stopped manually."})
            return
        }
        next()
    }
}

// client: get image & session data
router.get('/:token', fetch_session_info(), ensure_active_session(), (req, res) => {
    // Check if token exists and session has began
    var db = req.app.locals.db
    var image = res.locals.image
    var session = res.locals.session
    db.all("SELECT * FROM rules WHERE image_id = ?", image.id,
           (err, rules) => {
               if (err) {
                   res.status(500).json({sucess: false, message: err.message})
               }
               if (!rules) {
                   res.status(404).json({success: false, message: "No rules found"})
               }

               image.checklist = rules
               image.start_time = session.start_time
               res.send({success: true, message: encrypt(JSON.stringify(image))})
           })
})

// client: upload scoring data
router.post('/:token/report', fetch_session_info(), ensure_active_session(), (req, res) => {
    var token = req.params.token
    var db = req.app.locals.db
    var report = JSON.parse(decrypt(req.body))
    var session = res.locals.session
    if (session.status != 'Score') {
        res.status(403).json({success: false, message: "Wait for at least 1 minute before last submission"})
        return
    }

    // No need to validate report; this is made for practice images
    // using get because db.run doesn't call callback when there's no error
    db.get("UPDATE sessions SET report = $report, score = $score, last_scored = $last_scored WHERE token = $token;",
           {
               $report : report,
               $score : report.pts,
               $token : token,
               $last_scored : new Date()
           },
           (err) => {
               if (err){
                   res.status(500).json({success: false, message: err.message})
               }
               else
                   res.redirect(`/session/${token}/stop`)
           })
})

// view scoring report
router.get('/:token/report', fetch_session_info(), (req, res) => {
    var db = req.app.locals.db
    var image = res.locals.image
    var session = res.locals.session
    var report = JSON.parse(res.locals.session.report || empty_report)
    db.get('SELECT COUNT(*) AS total_vulns FROM rules WHERE image_id = ? AND points > 0', image.id,
           (err, row) => {
               if (err) {
                   res.status(500).json({success: false, message: err.message})
                   return
               }
               if (row.total_vulns == 0) {
                   res.status(400).json({success: false, message: "Error: no rules for this image"})
                   return
               }

               const reduce = (prev, curr) => ({ pts: prev.pts + curr.pts })

               var penal_pts = 0
               if (report.penalties.length > 0)
                   penal_pts = report.penalties.reduce(reduce).pts

               var vulns_pts = 0
               if (report.vulns.length > 0)
                   vulns_pts = report.vulns.reduce(reduce).pts

               res.render('../views/report', {
                   title: image.image_name + " Scoring Report",
                   partaker_name: session.user_name,
                   start_time: format_moment(moment(session.start_time)),
                   end_time: format_moment(moment(session.end_time)),
                   time_used: moment(session.start_time).fromNow(),
                   time_left: moment(session.end_time).fromNow(),

                   score: session.score,
                   penalties: report.penalties,
                   penal_pts: penal_pts,
                   vulns: report.vulns,
                   total_vulns: row.total_vulns,
                   vulns_pts: vulns_pts
               })
           })
})

// stop scoring
// using GET so the user can stop scoring easily
router.get('/:token/stop', fetch_session_info(), ensure_active_session(), (req, res) => {
    var token = req.params.token
    var db = req.app.locals.db
    // using get because db.run doesn't call callback when there's no error
    db.get('UPDATE sessions SET stopped = 1 WHERE token = ?', token,
           (err) => {
               if (err)
                   res.status(500).json({success: false, message: err.message})
               else
                   res.status(200).json({success: true, message: "Successfully stopped scoring."})
           })
})

// client: get session status
// Wait, Score, Termination
router.get('/:token/status', fetch_session_info(), (_req, res) => {
    var session = res.locals.session
    res.json({success: true, message: encrypt(JSON.stringify(session.status))})
})

module.exports = router
