var express = require('express');
var moment = require('moment');

var router = express.Router();
var Statistics = require('../../models/statistics');
var StatisticsVersions = require('../../models/statisticsVersions');
var StatisticsBlockcounts = require('../../models/statisticsBlockcounts');
var Account = require('../../models/account');

/* GET home page. */
router.get('/representatives', function (req, res) {
  Statistics.find({
    'date': {$gt: moment().subtract(3, 'days').toDate()}
  })
  .select('-_id date representatives')
  .exec(function (err, stats) {
    if (err) {
      console.log("API - All Reps", err);
      return;
    }
    res.json(stats);
  });
});

router.get('/nodeversions', function (req, res) {
  StatisticsVersions.find({
    'date': {$gt: moment().subtract(3, 'days').toDate()}
  })
  .select('-_id date nodeversions')
  .exec(function (err, stats) {
    if (err) {
      console.log("API - Node Versions", err);
      return;
    }
    res.json(stats);
  });
});

router.get('/blockcounts', function (req, res) {
  Account.find({
    'monitor.url': {
      $exists: true,
      $ne: null
    },
    'monitor.blocks': {
      $exists: true,
      $ne: null
    }
  })
  .select('-_id account alias monitor')
  .sort('-monitor.blocks')
  .exec(function (err, accounts) {
    if (err) {
      res.status(500);
      res.json({error: 'No Data'});
      return;
    }

    res.json(accounts);

  });
});

router.get('/blockcountsovertime', function (req, res) {
  StatisticsBlockcounts.find({
    'date': {$gt: moment().subtract(1, 'days').toDate()}
  })
  .select('-_id date blockcounts')
  .exec(function (err, stats) {
    if (err) {
      console.log("API - Blockcounts over time", err);
      return;
    }
    res.json(stats);
  });
});

module.exports = router;