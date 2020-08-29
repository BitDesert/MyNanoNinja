var async = require("async");
var cron = require('node-cron');
var moment = require('moment');

var Account = require('../models/account');
var Check = require('../models/check');

cron.schedule('*/30 * * * *', updateNodeUptime);

function updateNodeUptime() {
  console.log('UPTIME NOTIFICATION: Started');
  Account.find()
    .where('votingweight').gte(1000000000000000000000000000000)
    .populate('owner')
    .exec(function (err, accounts) {
      if (err) {
        console.error('UPTIME NOTIFICATION:', err);
        return
      }
      console.log('UPTIME NOTIFICATION: ' + accounts.length + " accounts");

      async.forEachOfSeries(accounts, (account, key, callback) => {

        checkNodeUptime(account, callback);

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('UPTIME NOTIFICATION: Done');
      });
    });
}

function checkNodeUptime(account, callback) {
  var previous = account.uptime_data.last;
  if (account.lastVoted && moment(account.lastVoted).isAfter(moment().subtract(30, 'minutes').toDate())) {
    account.uptime_data.up++;
    account.uptime_data.last = true;
  } else {
    account.uptime_data.down++;
    account.uptime_data.last = false;
  }
  account.uptime = ((account.uptime_data.up / (account.uptime_data.up + account.uptime_data.down)) * 100);

  var check = new Check();
  check.account = account._id;
  check.isUp = account.uptime_data.last;
  check.save();

  account.save(function (err) {
    if (err) {
      console.log("UPTIME NOTIFICATION: Error saving account", err);
    }
    account.updateUptimeFor('day')
    callback();
  });
}