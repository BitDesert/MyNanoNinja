var async = require("async");
var cron = require('node-cron');

var Account = require('../models/account');

const {
  Nano
} = require('nanode');

const nano = new Nano({
  url: process.env.NODE_RPC
});

// update account weights
cron.schedule('*/15 * * * *', updateWeights);

function updateWeights() {
  console.log('WEIGHTS: Started');

  Account.find().exec(function (err, accounts) {

    console.log('WEIGHTS:', accounts.length);

    async.forEachOfSeries(accounts, (account, key, callback) => {

      updateAccountWeight(account, callback);

    }, err => {
      if (err) {
        console.error(err.message);
        return
      }
      console.log('WEIGHTS: Done');
    });
  });
}

function updateAccountWeight(account, callback) {
  nano.accounts.weight(account.account)
    .then((weight) => {
      account.votingweight = weight;

      account.save(function (err) {
        if (err) {
          console.log("RPC - updateAccountWeight - Error saving account", err);
        }
        callback();
      });
    })
    .catch(reason => {
      console.error('onRejected function called: ', reason);
      callback();
    });
}