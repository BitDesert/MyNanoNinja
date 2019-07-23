var mongoose = require('mongoose');
var async = require("async");

mongoose.connect('mongodb://localhost:27017/nanonodeninja',
    { useNewUrlParser: true }
);

var Account = require('../models/account');

Account.find()
.exec(function (err, accounts) {
  if (err) {
    console.error('Update Prefix', err);
    return
  }
  console.log('== Update Prefix: ' + accounts.length + " accounts");

  async.forEachOfSeries(accounts, (account, key, callback) => {

    updatePrefix(account, callback);

  }, err => {
    if (err) {
      console.error(err.message);
      return
    }
    console.log('== Update Prefix done');
  });
});


function updatePrefix(account, callback) {

    account.account = account.account.replace(/xrb_/g, "nano_");

    console.log(account.account)
    account.save(function (err) {
      if (err) {
        console.log("CRON - checkNodeUptime - Error saving account", err);
      }
      callback();
    });
  }