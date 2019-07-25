var async = require("async");
var cron = require('node-cron');

var Account = require('../models/account');

const {
  Nano
} = require('nanode');

const nano = new Nano({
  url: process.env.NODE_RPC
});

// get all representatives
cron.schedule('0 * * * *', updateRepresentatives);

function updateRepresentatives() {
  console.log('REPRESENTATIVES: Started');

  nano.representatives().then((reps) => {

    console.log('REPRESENTATIVES:', Object.keys(reps).length);
    

    async.forEachOfSeries(reps, (weight, rep, callback) => {

      checkRepresentative(rep, weight, callback)

    }, err => {
      if (err) {
        console.error(err.message);
        return
      }
      console.log('REPRESENTATIVES: Done');
    });
  });
}

function checkRepresentative(rep, weight, cb) {
  Account.findOne({
    'account': rep
  }, function (err, account) {
    if (err) {
      cb();
      return
    }

    if (!account) {
      var account = new Account();
      account.account = rep;
      account.votingweight = weight;

      account.save(function (err) {
        if (err) {
          console.log("RPC - checkRepresentative - Error saving account", err);
        }
        cb();
      });

      // console.log('New rep: '+rep);
    } else {
      cb();
    }
  });
}