module.exports = function (nanorpc) {
  var express = require('express');
  var router = express.Router();
  var Account = require('../models/account');
  var moment = require('moment');

  /* GET users listing. */
  router.get('/:address', function (req, res, next) {
    var myaccount = req.params.address;

    Account.findOne({
        'account': myaccount
      })
      .populate('owner')
      .exec(function (err, account) {
        if (err || !account) {
          res.status(404);
          res.render('error', {
            message: 'Address is not a valid representative',
            error: {}
          });
          return;
        }

        if(account.alias){
          var title = account.alias;
        } else {
          var title = account.account;
        }

        res.render('account', {
          title: title,
          loggedin: req.isAuthenticated(),
          user: req.user,
          nanorpc: nanorpc,
          moment: moment,
          account: account,
          round: round,
          votingWeight: variableRound(nanorpc.rpc.convert.fromRaw(account.votingweight, 'mrai'))
        });

      });
  });

  function variableRound(value){
    if(value > 1){
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