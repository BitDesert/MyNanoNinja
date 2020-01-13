module.exports = function (passport, nanorpc) {

  var express = require('express');
  var request = require('request');
  var router = express.Router();
  var Account = require('../models/account');
  const Big = require('big.js');
  multNANO = Big('1000000000000000000000000000000');

  /* GET users listing. */
  router.get('/login', function (req, res, next) {
    res.render('login', {
      loggedin: req.isAuthenticated()
    });
  });

  router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
  });

  // Nano check
  router.get('/connect/nano', isLoggedIn, function (req, res) {
    var user = req.user;

    res.render('auth/nano', { 
      loggedin: req.isAuthenticated(),
      user : req.user,
      amount: process.env.VERIFICATION_AMOUNT,
      amount_raw: Big(process.env.VERIFICATION_AMOUNT).times(multNANO).toFixed().toString()
    });

  });

  router.get('/connect/nano/:token/verify', isLoggedIn, function (req, res) {
    var user = req.user;
    var token = req.params.token;

    var output = {};

    request.get({
      url: process.env.DOMAIN + '/payment/api/verify?token='+token,
      json: true
    }, function(err, response, data){
      if (err || response.statusCode !== 200) {
        output.error = 'API error';
        res.send(output);

      } else if(data.fulfilled === false){
        output.error = 'not_fulfilled';
        res.send(output);

      } else if(data.amount != process.env.VERIFICATION_AMOUNT){
        output.error = 'wrong_amount';
        res.send(output);

      } else {
        var sender = data.sender;

        for (const block in data.subPayments) {
          var sender = data.subPayments[block].account;
          Account.findOne({
            'account': sender
          }, function (err, account) {
            if (err){
              return
            }
        
            if (!account){
              var account = new Account();
              account.account = sender;
            }
            account.owner = user._id;
        
            account.save(function (err) {
              if (err) {
                console.log("Auth - Nano Token Verify - Error saving account", err);
              }
              output.status = 'OK';
              output.sender = sender;
              res.send(output);
            });
          });

          // only the first payment
          return;
        }
      }
    });
  });

  // facebook -------------------------------

  // send to facebook to do the authentication
  router.get('/facebook', passport.authenticate('facebook', {
    scope: ['public_profile', 'email']
  }));

  // handle the callback after facebook has authenticated the user
  router.get('/facebook/callback',
    passport.authenticate('facebook', {
      successRedirect: '/profile',
      failureRedirect: '/'
    })
  );
  
  // unlink account
  router.get('/unlink/facebook', isLoggedIn, function (req, res) {
    var user = req.user;
    user.facebook.token = undefined;
    user.save(function (err) {
      res.redirect('/profile');
    });
  });

  // twitter --------------------------------

  // send to twitter to do the authentication
  router.get('/twitter', passport.authenticate('twitter', {
    scope: 'email'
  }));

  // handle the callback after twitter has authenticated the user
  router.get('/twitter/callback',
    passport.authenticate('twitter', {
      successRedirect: '/profile',
      failureRedirect: '/'
    })
  );

  // unlink account
  router.get('/unlink/twitter', isLoggedIn, function (req, res) {
    var user = req.user;
    user.twitter.token = undefined;
    user.save(function (err) {
      res.redirect('/profile');
    });
  });

  // google ---------------------------------

  // send to google to do the authentication
  router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

  // the callback after google has authenticated the user
  router.get('/google/callback',
    passport.authenticate('google', {
      successRedirect: '/profile',
      failureRedirect: '/'
    })
  );

  // unlink account
  router.get('/unlink/google', isLoggedIn, function (req, res) {
    var user = req.user;
    user.google.token = undefined;
    user.save(function (err) {
      res.redirect('/profile');
    });
  });

  // github ---------------------------------

  // send to google to do the authentication
  router.get('/github', passport.authenticate('github'));

  // the callback after google has authenticated the user
  router.get('/github/callback',
    passport.authenticate('github', {
      successRedirect: '/profile',
      failureRedirect: '/'
    })
  );

  // unlink account
  router.get('/unlink/github', isLoggedIn, function (req, res) {
    var user = req.user;
    user.github.token = undefined;
    user.save(function (err) {
      res.redirect('/profile');
    });
  });

  // reddit ---------------------------------

  // send to google to do the authentication
  router.get('/reddit', function(req, res, next){
    req.session.state = makeid();
    passport.authenticate('reddit', {
      state: req.session.state,
      duration: 'permanent',
    })(req, res, next);
  });

  // the callback after google has authenticated the user
  router.get('/reddit/callback', function(req, res, next){
    // Check for origin via state token
    if (req.query.state == req.session.state){
      passport.authenticate('reddit', {
        successRedirect: '/profile',
        failureRedirect: '/'
      })(req, res, next);
    } else {
      next( new Error(403) );
    }
  });
  
  // unlink account
  router.get('/unlink/reddit', isLoggedIn, function (req, res) {
    var user = req.user;
    user.reddit.token = undefined;
    user.save(function (err) {
      res.redirect('/profile');
    });
  });

  // Discord ---------------------------------

  // send to google to do the authentication
  router.get('/discord', passport.authenticate('discord'));

  // the callback after google has authenticated the user
  router.get('/discord/callback',
    passport.authenticate('discord', {
      successRedirect: '/profile',
      failureRedirect: '/'
    })
  );

  // unlink account
  router.get('/unlink/discord', isLoggedIn, function (req, res) {
    var user = req.user;
    user.discord.token = undefined;
    user.save(function (err) {
      res.redirect('/profile');
    });
  });

  // Telegram ---------------------------------

  // send to google to do the authentication
  router.get('/telegram', passport.authenticate('telegram'));

  // the callback after google has authenticated the user
  router.get('/telegram/callback',
    passport.authenticate('telegram', {
      successRedirect: '/profile',
      failureRedirect: '/'
    })
  );

  // unlink account
  router.get('/unlink/telegram', isLoggedIn, function (req, res) {
    var user = req.user;
    user.telegram.id = undefined;
    user.save(function (err) {
      res.redirect('/profile');
    });
  });

  // other stuff ---------------------------------

  // route middleware to ensure user is logged in
  function isLoggedIn(req, res, next) {
    if (req.isAuthenticated())
      return next();

    res.redirect('/');
  }

  function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
  }

  return router;

}

//module.exports = router;