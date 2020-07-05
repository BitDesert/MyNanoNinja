var async = require("async");
var cron = require('node-cron');
var rp = require('request-promise');

var Account = require('../models/account');

const NanoClient = require('nano-node-rpc');
const client = new NanoClient({url: process.env.NODE_RPC})

// account delegators count
cron.schedule('0 3 * * *', updateDelegators);

async function updateDelegators() {
  console.log('DELEGATORS: Started');

  var online_stake_total = (await client._send("confirmation_quorum")).online_stake_total;

  // only principals
  Account.find({ 'votingweight': { $gt: (online_stake_total / 1000) } })
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
  client._send('delegators_count', { account: account.account })
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