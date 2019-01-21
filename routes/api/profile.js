var express = require('express');
var router = express.Router();
var Account = require('../../models/account');

/* GET users listing. */
router.get('/accounts', ensureAuthenticated, function(req, res, next) {
  var user = req.user;
  
  Account.find()
  .select('-_id account')
  .where({'owner': user._id})
  .exec(function (err, accounts) {
    res.json({
      accounts: accounts
    });
  });
  
});

router.get('/user', ensureAuthenticated, function(req, res, next) {
  var user = req.user;

  res.json(user)
  
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    next();
    return;
  }

  req.session.returnTo = req.path;
  res.redirect('/auth/login');
};

module.exports = router;
