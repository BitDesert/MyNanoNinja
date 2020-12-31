var async = require("async");
var cron = require('node-cron');

var Account = require('../models/account');

// Uptime tracking
// every hour 00:42
cron.schedule('42 * * * *', function(){
  var types = ['week'];
  updateUptime(types)
});

// every day at 03:33
cron.schedule('33 3 * * *', function(){
  var types = ['month', '3_months', '6_months', 'year'];
  updateUptime(types)
});

function updateUptime(types) {
  console.log('UPTIME: Started', types);
  Account.find()
    .where('votingweight').gte(1000000000000000000000000000000000) // 1000 NANO minimum
    .exec(function (err, accounts) {
      if (err) {
        console.error('UPTIME:', err);
        return
      }
      console.log('UPTIME: ' + accounts.length + " accounts");

      async.forEachOfSeries(accounts, (account, key, callback) => {

        updateUptimeAccount(account, types, callback)

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('UPTIME: Done', types);
      });
    });
}

function updateUptimeAccount(account, types, callback) {
  async.forEachOfSeries(types, (type, key, cb) => {

    account.updateUptimeFor(type, cb)

  }, err => {
    if (err) {
      console.error(err.message);
    }
    callback();
  });
}