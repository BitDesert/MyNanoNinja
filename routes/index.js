module.exports = function (nanorpc) {

  var express = require('express');
  var moment = require('moment');

  var router = express.Router();
  var Account = require('../models/account');

  /* GET home page. */
  router.get('/', function (req, res, next) {
    Account.find({
      'owner': { $exists: true, $ne: null },
      'lastVoted': {
        $gt: moment().subtract(1, 'day').toDate()
      },
    })
      .where('votingweight').gt(0)
      .where('score').gte(80)
      .sort('-score')
      .populate('owner')
      .exec(function (err, accounts) {
        res.render('index', {
          loggedin: req.isAuthenticated(),
          moment: moment,
          accounts: accounts,
          nanorpc: nanorpc,
          variableRound: variableRound
        });
      });
  });

  /* GET home page. */
  router.get('/principals', function (req, res, next) {
    Account.find()
      .where('votingweight').gte((nanorpc.getOnlineStakeTotal() / 1000))
      .sort('-votingweight')
      .populate('owner')
      .exec(function (err, accounts) {
        if (err) {          
          return res.status(500).json(err);;
        }

        res.render('principals', {
          loggedin: req.isAuthenticated(),
          title: 'Principal Representatives',
          moment: moment,
          accounts: accounts,
          nanorpc: nanorpc,
          variableRound: variableRound,
          round: round
        });
      });
  });

  router.get('/map', function (req, res, next) {
    res.render('map', {
      loggedin: req.isAuthenticated(),
      title: 'Map'
    });
  });

  router.get('/faq', function (req, res, next) {
    res.render('faq', {
      loggedin: req.isAuthenticated(),
      title: 'FAQ'
    });
  });

  function variableRound(value) {
    if (value > 1) {
      return round(value, 2);
    } else if (value > 0.1) {
      return round(value, 3);
    } else {
      return round(value, 4);
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