var express = require('express');
var moment = require('moment');

var router = express.Router();
var StatisticsVersions = require('../../models/statistics/versions');
var StatisticsBlockcounts = require('../../models/statistics/blockcounts');
var Statistics = require('../../models/statistics/representatives');
var StatisticsQuorum = require('../../models/statistics/quorum');
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

router.get('/blockcounts', async function (req, res) {
  Account.find({
    'monitor.url': {
      $exists: true,
      $ne: null
    },
    'monitor.blocks': {
      $exists: true,
      $ne: null,
      $gte: ((await client.block_count()).count - 100000)
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

router.get('/quorum', function (req, res) {
  StatisticsQuorum.find({
    'date': {$gt: moment().subtract(1, 'days').toDate()}
  })
  .select('-_id date quorum_delta online_stake_total peers_stake_total')
  .exec(function (err, stats) {
    if (err) {
      console.log("API - Quorum", err);
      return;
    }
    res.json(stats);
  });
});

module.exports = router;