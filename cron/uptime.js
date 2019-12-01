var async = require("async");
var cron = require('node-cron');

var Account = require('../models/account');

// Uptime tracking
cron.schedule('0 * * * *', function(){
  var types = ['week'];
  updateUptime(types)
});

cron.schedule('0 3 * * *', function(){
  var types = ['month', '3_months', '6_months', 'year'];
  updateUptime(types)
});

function updateUptime(types) {
  console.log('UPTIME: Started', types);
  Account.find()
    .where('votingweight').gte(1000000000000000000000000000000)
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