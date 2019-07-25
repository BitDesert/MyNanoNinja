var async = require("async");
var cron = require('node-cron');

var Account = require('../models/account');

// Uptime tracking
cron.schedule('0 * * * *', updateUptime);

function updateUptime() {
  console.log('UPTIME: Started');
  Account.find()
    .where('votingweight').gte(1000000000000000000000000000000)
    .exec(function (err, accounts) {
      if (err) {
        console.error('UPTIME:', err);
        return
      }
      console.log('UPTIME: ' + accounts.length + " accounts");

      async.forEachOfSeries(accounts, (account, key, callback) => {

        updateUptimeAccount(account, callback)

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('UPTIME: Done');
      });
    });
}

function updateUptimeAccount(account, callback) {
  var types = ['week', 'month', '3_months', '6_months', 'year'];

  async.forEachOfSeries(types, (type, key, cb) => {

    account.updateUptimeFor(type, cb)

  }, err => {
    if (err) {
      console.error(err.message);
    }
    callback();
  });
}