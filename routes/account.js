module.exports = function (nanorpc) {
  var express = require('express');
  var router = express.Router();
  var Account = require('../models/account');
  var moment = require('moment');

  /* GET users listing. */
  router.get('/:address', function (req, res, next) {
    var myaccount = req.params.address;

    Account.findOne({
      $or: [
        { 'account': myaccount },
        { 'slug': myaccount }
      ]
    })
      .populate('owner')
      .exec(function (err, account) {
        if (err) {
          res.status(404);
          res.render('error', {
            message: 'Whoops! There was an error...',
            error: {}
          });
          return;
        }

        if (account) {

          if (account.slug && account.slug != myaccount) {
            res.redirect('/account/' + account.slug)
          }
          if (account.alias) {
            var title = account.alias;
          } else {
            var title = account.account;
          }
          var votingWeight = variableRound(nanorpc.rpc.convert.fromRaw(account.votingweight, 'mrai'));
        } else {
          var title = myaccount;
          var votingWeight = null;
          var account = null;
        }

        res.render('account', {
          title: title,
          loggedin: req.isAuthenticated(),
          user: req.user,
          nanorpc: nanorpc,
          moment: moment,
          account: account,
          round: round,
          votingWeight: votingWeight,
          myaccount: myaccount
        });

      });
  });

  function variableRound(value) {
    if (value > 1) {
      return round(value, 2);
    } else {
      return round(value, 5);
    }
  }

  function round(value, precision) {
    if (Number.isInteger(precision)) {
      var shift = Math.pow(10, precision);
      return Math.round(value * shift) / shift;
    } else {
      return Math.round(value);
    }
  }

  return router;
}