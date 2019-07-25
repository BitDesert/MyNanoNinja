var async = require("async");
var cron = require('node-cron');
var rp = require('request-promise');

var Account = require('../models/account');

const {
  Nano
} = require('nanode');

const nano = new Nano({
  url: process.env.NODE_RPC
});

// account delegators count
cron.schedule('0 3 * * *', updateDelegators);

function updateDelegators() {
  console.log('DELEGATORS: Started');

  // only principals
  Account.find({ 'votingweight': { $gt: 133248289218203497353846153999000000 } })
    .exec(function (err, accounts) {
      console.log('DELEGATORS: Reps found: ' + accounts.length);

      async.forEachOfSeries(accounts, (account, key, callback) => {

        updateAccountDelegatorsExternal(account, callback);

      }, err => {
        if (err) {
          console.error('DELEGATORS:', err.message);
          return
        }
        console.log('DELEGATORS: Done');
      });
    });
}

/*
function updateAccountDelegators(account, callback) {
  console.log('Updating delegators of', account.account)
  nano.rpc('delegators_count', { account: account.account })
    .then((delegators) => {

      console.log(account.account, delegators.count, 'delegators')

      account.delegators = delegators.count;
  
      account.save(function (err) {
        if (err) {
          console.log("RPC - updateAccountDelegators - Error saving account", err);
        }
        callback();
      });
    })
    .catch(reason => {
      console.error('onRejected function called: ', reason);
      callback(false);
    });
}
*/

function updateAccountDelegatorsExternal(account, callback) {
  console.log('DELEGATORS: Updating', account.account)

  rp({
    uri: 'https://api.nanocrawler.cc/v2/accounts/' + account.account + '/delegators',
    json: true
  })
    .then((data) => {
      console.log('DELEGATORS:', account.account, Object.keys(data.delegators).length, 'delegators')

      account.delegators = Object.keys(data.delegators).length;
  
      account.save(function (err) {
        if (err) {
          console.log("RPC - updateAccountDelegators - Error saving account", err);
        }
        callback();
      });

    }).catch((error) => {
      console.error(error)
      callback()
    })
}