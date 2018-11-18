var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/:hash', function (req, res, next) {
  res.render('block', {
    title: req.params.hash,
    loggedin: req.isAuthenticated(),
    hash: req.params.hash
  });
});

module.exports = router;