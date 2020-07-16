var express = require('express');

var router = express.Router();

/* GET home page. */
router.get('/representatives', function (req, res) {
  res.render('statistics/representatives', {
    loggedin: req.isAuthenticated(),
    title: 'Representatives Statistics'
  });
});

router.get('/blockcount', function (req, res) {    
  res.render('statistics/blockcount', {
    loggedin: req.isAuthenticated(),
    title: 'Blockcount Statistics'
  });
});

router.get('/versions', function (req, res) {    
  res.render('statistics/versions', {
    loggedin: req.isAuthenticated(),
    title: 'Version Statistics'
  });
});

router.get('/protocols', function (req, res) {    
  res.render('statistics/protocols', {
    loggedin: req.isAuthenticated(),
    title: 'Protocol Statistics'
  });
});

router.get('/difficulty', function (req, res) {    
  res.render('statistics/difficulty', {
    loggedin: req.isAuthenticated(),
    title: 'Difficulty Statistics'
  });
});

module.exports = router;