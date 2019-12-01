var mongoose = require('mongoose');
var async = require("async");

mongoose.connect('mongodb://localhost:27017/mynanoninja',
  { useNewUrlParser: true }
);

var Account = require('../models/account');
var Check = require('../models/check');

var end = new Date(Date.now());
var begin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

Account.find({
  uptime: { $gt: 0 },
  lastVoted: { $gt: begin }
})
  .exec(function (err, accounts) {
    if (err) {
      console.error('Update', err);
      return
    }
    console.log('== Update: ' + accounts.length + " accounts");

    async.forEachOfSeries(accounts, (account, key, callback) => {

      Check.find({
        timestamp: { $gte: begin, $lte: end },
        isUp: false,
        'account': account._id
      })
        .exec(function (err, checks) {
          if (err) {
            console.error('Update', err);
            return
          }
          console.log('== Update: ' + checks.length + " checks", account.account, account.uptime);

          async.forEachOfSeries(checks, (check, key, callback) => {
    
            check.isUp = true;
            check.save(function(){
              callback()
            })
        
          }, err => {
            if (err) {
              console.error(err.message);
              return
            }
            console.log('== Update for account done');
            callback()
          });

        });

    }, err => {
      if (err) {
        console.error(err.message);
        return
      }
      console.log('== Update done');
    });
  });

