var cron = require('node-cron');
var moment = require('moment');
var async = require("async");
var tools = require('../tools');

const {
  Nano
} = require('nanode');

const node = new Nano({
  url: process.env.NODE_RPC
});

var Account = require('../models/account');
var Statistics = require('../models/statistics/representatives');
var StatisticsVersions = require('../models/statistics/versions');
var StatisticsBlockcounts = require('../models/statistics/blockcounts');
var StatisticsQuorum = require('../models/statistics/quorum');

function updateStatisticsUptime() {

  var obj = {
    total: {
      votingweight: {
        $gte: 0
      }
    },
    eligible: {
      votingweight: {
        $gte: 133248289218203497353846153999000000
      }
    }, // more than 0.1 %
    online: {
      lastVoted: {
        $gt: moment().subtract(15, 'minutes').toDate()
      },
      votingweight: {
        $gte: 0
      }
    },
  };

  var repstats = {};

  async.forEachOf(obj, (value, key, callback) => {
    Account.find(value)
      .exec(function (err, accounts) {
        if (err) {
          console.error(err);
          callback(false);
          return;
        }
        repstats[key] = accounts.length;
        callback();
      });
  }, err => {
    if (err) {
      console.error(err.message);
      return
    }
    var stats = new Statistics();
    stats.representatives = repstats;
    stats.save(function (err) {
      if (err) {
        console.error('CRON - updateStatistics - ', err);
        return
      }
    })
  });
}

function updateStatisticsVersions() {
  node.rpc('peers').then(function (peers) {

    var stats = new StatisticsVersions();

    for (var peer in peers.peers) {
      stats.nodeversions[peers.peers[peer]]++;
    }

    console.log(stats);

    stats.save(function (err) {
      if (err) {
        console.error('CRON - updateStatistics - ', err);
        return
      }
      console.log('updateStatisticsVersions done');
    })

  });
}

function updateStatisticsBlockcounts() {
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
  .select('-_id account monitor')
  .sort('-monitor.blocks')
  .exec(function (err, accounts) {
    if (err) {
      return;
    }
    var stats = new StatisticsBlockcounts();

    var blockcounts = [];
    for (var account in accounts) {
      blockcounts.push(accounts[account].monitor.blocks);
    }

    var medianblockcount = tools.median(blockcounts);

    for (var account in accounts) {
      if(accounts[account].monitor.blocks > medianblockcount - 10000){
        stats.blockcounts.push({
          account: accounts[account].account,
          count: accounts[account].monitor.blocks
        });
      }
    }

    stats.save(function (err) {
      if (err) {
        console.error('CRON - updateStatistics - ', err);
        return
      }
    })

  });
}

function updateStatisticsQuorum() {
  node.rpc('confirmation_quorum').then(function (response) {
    if(!response) return

    var stats = new StatisticsQuorum();

    stats.quorum_delta = response.quorum_delta;
    stats.online_stake_total = response.online_stake_total;
    stats.peers_stake_total = response.peers_stake_total;

    console.log(stats);

    stats.save(function (err) {
      if (err) {
        console.error('CRON - updateStatisticsQuorum - ', err);
        return
      }
      console.log('updateStatisticsQuorum done');
    })

  });
}

cron.schedule('0 * * * *', updateStatistics);

function updateStatistics() {
  console.log('Updating Statistics...');
  updateStatisticsUptime();
  updateStatisticsVersions();
  updateStatisticsBlockcounts();
  updateStatisticsQuorum();
}