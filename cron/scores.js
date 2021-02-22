var async = require("async");
var cron = require('node-cron');
var nanorpc = require('../nano/rpc_client');
var moment = require('moment');

var Account = require('../models/account');

cron.schedule('5 * * * *', updateScore);

function updateScore() {
  console.log('SCORES: Started');
  Account.find()
    .where('votingweight').gte(1000000000000000000000000000000000) // 1000 NANO minimum
    .exec(function (err, accounts) {
      if (err) {
        console.error('SCORES:', err);
        return
      }
      console.log('SCORES: ' + accounts.length + " accounts");

      async.forEachOfSeries(accounts, (account, key, callback) => {

        updateScoreAccount(account, callback)

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('SCORES: Done');
      });
    });
}

function updateScoreAccount(account, callback) {
  // calculate weight score
  var weightpercent = (account.votingweight / nanorpc.getOnlineStakeTotal()) * 100;

  var score_weight = 100 / (1 + Math.exp(8 * weightpercent - 10));

  // calculate uptime score
  var score_uptime = Math.pow(10, -6) * Math.pow(account.uptime_over['6_months'], 4);

  // calculate days since creation score
  var dayssincecreation = moment().diff(moment(account.created), 'days');
  var score_age = (100 + (-100 / (1 + Math.pow(dayssincecreation / 60, 4))));

  // calculate latency score
  var score_latency = 100 / (1 + Math.exp(0.012 * account.votelatency - 8));

  // divide so we get a smooth max 100 points
  var scorecount = 4;
  var divider = Math.pow(100, scorecount) / 100
  score = (score_weight * score_uptime * score_age * score_latency) / divider;

  // round the final score
  account.score = Math.round(score);
  //console.log(account.account + ": " + account.score);

  account.save(function (err) {
    if (err) {
      console.log("SCORES: - Error saving account", err);
    }
    callback();
  });
}