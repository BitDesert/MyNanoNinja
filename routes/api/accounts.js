var express = require('express');
var moment = require('moment');
const {
  Nano
} = require('nanode');

const nano = new Nano({
  url: process.env.NODE_RPC
});
var router = express.Router();
var Account = require('../../models/account');

router.get('/active', function (req, res) {
  Account.find()
    .where('votingweight').gte(133248289218203497353846153999000000)
    .sort('-votingweight')
    .select('-_id account alias uptime votingweight delegators')
    .exec(function (err, accounts) {
      if (err) {
        console.log("API - All Reps", err);
        return;
      }
      res.json(accounts);
    });
});

router.get('/active/online', function (req, res) {
  Account
    .find({
      'lastVoted': {
        $gt: moment().subtract(1, 'hours').toDate()
      }
    })
    .where('votingweight').gte(133248289218203497353846153999000000)
    .sort('-votingweight')
    .select('-_id account alias uptime votingweight delegators')
    .exec(function (err, accounts) {
      if (err) {
        console.log("API - All Reps", err);
        return;
      }
      res.json(accounts);
    });
});

router.get('/verified', function (req, res) {
  Account.find({
    'owner': {
      $exists: true,
      $ne: null
    },
    'lastVoted': {
      $gt: moment().subtract(1, 'hours').toDate()
    },
    'created': {
      $lt: moment().subtract(1, 'weeks').toDate()
    }
  })
    .where('votingweight').gt(0)
    .where('uptime').gte(95)
    .sort('votingweight')
    .select('-_id account alias uptime votingweight delegators')
    .exec(function (err, accounts) {
      if (err) {
        console.log("API - All Reps", err);
        return;
      }
      res.json(accounts);
    });
});

router.get('/:account', function (req, res) {
  Account.findOne({
    'account': req.params.account
  })
    .select('-_id account alias uptime lastVoted votingweight delegators description website location monitor')
    .exec(function (err, account) {
      if (err || !account) {
        console.log("API - Account", err);
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.json(account);
    });
});

router.get('/:account/history', function (req, res) {
  nano.accounts.history(req.params.account, 50)
  .then(history => {
    if(!history) return res.status(404).json({ error: 'Not found' });

    res.json(history);
  })
  .catch(reason => {
    res.status(500).json({ error: 'Not found' });
  });
});

router.get('/:account/pending', function (req, res) {
  nano.accounts.pending(req.params.account, 50, '0.000001')
  .then(history => {
    if(!history) return res.status(404).json({ error: 'Not found' });

    res.json(history);
  })
  .catch(reason => {
    res.status(500).json({ error: 'Not found' });
  });
});

module.exports = router;