const axios = require('axios');
var async = require("async");
var cron = require('node-cron');

var Account = require('../models/account');

const {
  Nano
} = require('nanode');

const nano = new Nano({
  url: process.env.NODE_RPC
});

cron.schedule('* * * * *', updateOnlineReps);

updateOnlineReps()

function updateOnlineReps() {
  console.log('VOTES: Started');

  var provider = JSON.parse(process.env.DRPC_REPSONLINE);
  provider.push('local')
  var onlinereps = [];

  async.forEachOf(provider, (currentprovider, key, callback) => {

    getRepsOnline(currentprovider, function (err, data) {
      if (err) {
        // error getting data
        console.error('VOTES: Error at', currentprovider);
        callback();
        return;
      }

      try {
        console.log('VOTES:', currentprovider, data.representatives.length)

        for (var rep of data.representatives) {
          if (!onlinereps.includes(rep)) {
            onlinereps.push(rep)
          }
        };
      } catch (error) {
        console.error('VOTES: Catch Error:', currentprovider, error);
        callback()
        return
      }
      callback()
    });


  }, err => {
    if (err) {
      console.error('VOTES: Completed with error:', err.message);
      return
    }
    console.log('VOTES: ' + onlinereps.length + ' individual reps online');

    console.log('VOTES: Updating accounts...');
    async.forEachOfSeries(onlinereps, (rep, key, callback) => {

      updateVoteSimple(rep, callback);

    }, err => {
      if (err) {
        console.error('VOTES: Not done', err.message);
        return
      }
      console.log('VOTES: Done');
    });
  });
}

function getRepsOnline(provider, callback) {
  if (provider == 'local') {
    nano.rpc('representatives_online').then(function (reps) {
      callback(null, reps)
    }).catch((error) => {
      console.error('getRepsOnline', error)
      callback(true)
    })
  } else {
    axios.get(provider, {
      timeout: 5000
    }).then(response => {
      callback(null, response.data)
    }).catch(error => {
      console.error(error.code, error.message, error.config.url);
      callback(true);
    })
  }
}

function updateVoteSimple(rep, callback) {
  Account.findOne(
    {
      'account': rep
    }, function (err, account) {
      if (err) {
        return;
      }

      if (!account) {
        var account = new Account();
        account.account = rep;
      }

      account.lastVoted = Date.now();
      account.save(function (err) {
        if (err) {
          console.log("updateVoteSimple - Error saving account", err);
        }
        callback();
      });

    });
}