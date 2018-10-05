var express = require('express');
var router = express.Router();
var Account = require('../models/account');

/* GET users listing. */
router.get('/', ensureAuthenticated, function(req, res, next) {
  var user = req.user;
  
  Account.find()
  .where({'owner': user._id})
  .exec(function (err, accounts) {
    res.render('profile', { 
      loggedin: req.isAuthenticated(),
      title: 'My Profile',
      user: user,
      emails: user.getEmails(),
      accounts: accounts
    });
  });

  
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
