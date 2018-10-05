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

module.exports = router;