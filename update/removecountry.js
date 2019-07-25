var mongoose = require('mongoose');
var async = require("async");

mongoose.connect('mongodb://localhost:27017/nanonodeninja',
    { useNewUrlParser: true }
);

var Account = require('../models/account');

Account.find({
  location: {$exists: true}
})
.exec(function (err, accounts) {
  if (err) {
    console.error('Update', err);
    return
  }
  console.log('== Update: ' + accounts.length + " accounts");

  async.forEachOfSeries(accounts, (account, key, callback) => {
    
    account.location = {};
    account.save(function(){
      callback()
    })

  }, err => {
    if (err) {
      console.error(err.message);
      return
    }
    console.log('== Update done');
  });
});