console.log('=== STARING NANO NINJA CRON ===');

// global requirements
var Raven = require('raven');
Raven.config(process.env.SENTRY_URL).install();

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL,
  { useNewUrlParser: true }
);

// models
var Account = require('./models/account');
var User = require('./models/user');
var Check = require('./models/check');

// other requirements
var nanorpc = require('./nano/rpc_client');
const {
  Nano
} = require('nanode');
var cron = require('node-cron');
var moment = require('moment');
var async = require("async");
var request = require('request');
var rp = require('request-promise');
var tools = require('./tools');

// cron subtasks
require('./cron/peers');
require('./cron/statistics');
require('./cron/votes');
require('./cron/uptime');

const nano = new Nano({
  url: process.env.NODE_RPC
});

/*
 * UPDATE NODE MONITORS
 */

cron.schedule('*/15 * * * *', updateNodeMonitors);

function updateNodeMonitors() {
  console.log('MONITORS: Started');
  
  Account.find({
    'monitor.url': {
      $exists: true,
      $ne: null
    }
  })
    .exec(function (err, accounts) {
      if (err) {
        console.error('MONITORS: ', err);
        return
      }
      console.log('MONITORS: ' + accounts.length + " accounts with a monitor");

      async.eachOfLimit(accounts, 4, (account, key, callback) => {

        updateNodeMonitor(account, callback);

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('MONITORS: Done');
      });
    });
}

function updateNodeMonitor(account, callback) {  
  request.get({
    url: account.monitor.url + '/api.php',
    json: true,
    timeout: 5000
  }, function (err, response, data) {
    try {
      if (err) {
        //console.log('MONITORS: Could not contact monitor for ' + account.account);
        callback();
        return;

      } else if (response.statusCode !== 200) {
          //console.log('MONITORS: Could not contact monitor for ' + account.account + ' (' + response.statusCode + ')');
          callback();
          return;

      }
      
      // check for old prefix
      var nanoNodeAccount = data.nanoNodeAccount;
      if ((nanoNodeAccount.startsWith('xrb_1') || nanoNodeAccount.startsWith('xrb_3')) && nanoNodeAccount.length === 64) {
        nanoNodeAccount = 'nano_' + nanoNodeAccount.substring(4,64);
      }
      
      if (nanoNodeAccount != account.account) {
        console.log('MONITORS: Account mismatch: ' + account.account);

        // remove the fields
        delete account.monitor.version;
        delete account.monitor.blocks;
        delete account.monitor.sync;

      } else {
        account.monitor.version = data.version;
        account.monitor.blocks = data.currentBlock;
        account.monitor.sync = tools.round((data.currentBlock / nanorpc.getBlockcount()) * 100, 3);
        if (account.monitor.sync > 100) {
          account.monitor.sync = 100;
        }
      }

      account.save(function (err) {
        if (err) {
          console.error('MONITORS: ', err);
        }
        callback();
      });
    } catch (error) {
      console.error('MONITORS: Problem with updateNodeMonitor', error)
      callback();
    }
  });
}

function updateScore() {
  console.log('SCORES: Started');
  Account.find()
    .where('votingweight').gt(0)
    .exec(function (err, accounts) {
      if (err) {
        console.error('SCORES:', err);
        return
      }
      console.log('SCORES: ' + accounts.length + " accounts");

      async.forEachOfSeries(accounts, (account, key, callback) => {

        updateScoreAccount(account, callback)

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('SCORES: Done');
      });
    });
}

function updateScoreAccount(account, callback) {
  // calculate weight score
  var weightpercent = (account.votingweight / nanorpc.getAvailable()) * 100;

  var score_weight = 100 / (1 + Math.exp(8 * weightpercent - 10));

  // calculate uptime score
  var score_uptime = Math.pow(10, -6) * Math.pow(account.uptime, 4);

  // calculate days since creation score
  var dayssincecreation = moment().diff(moment(account.created), 'days');
  var score_age = (100 + (-100 / (1 + Math.pow(dayssincecreation / 60, 4))));

  // divide so we get a smooth max 100 points
  score = (score_weight * score_uptime * score_age) / 10000;

  // round the final score
  account.score = Math.round(score);
  //console.log(account.account + ": " + account.score);

  account.save(function (err) {
    if (err) {
      console.log("SCORES: - Error saving account", err);
    }
    callback();
  });
}

cron.schedule('5 * * * *', updateScore);
//updateScore();

// Uptime tracking
cron.schedule('0 * * * *', updateUptime);

function updateUptime() {
  console.log('UPTIME: Started');
  Account.find()
    .where('votingweight').gt(0)
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

// get all representatives
cron.schedule('0 * * * *', updateRepresentatives);

function updateRepresentatives(){
  console.log('REPRESENTATIVES: Started');
  
  nano.representatives().then((reps) => {

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

function checkRepresentative(rep, weight, cb){  
  Account.findOne({
    'account': rep
  }, function (err, account) {
    if (err){
      cb();
      return
    }

    if (!account){
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

// update account weights
cron.schedule('*/15 * * * *', updateWeights);

function updateWeights() {
  console.log('WEIGHTS: Started');

  Account.find().exec(function (err, accounts) {

      async.forEachOfSeries(accounts, (account, key, callback) => {
    
        updateAccountWeight(account, callback);
    
      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('WEIGHTS: Done');
      });
  });
}

function updateAccountWeight(account, callback){
  nano.accounts.weight(account.account)
  .then((weight) => {
    account.votingweight = weight;

    account.save(function (err) {
      if (err) {
        console.log("RPC - updateAccountWeight - Error saving account", err);
      }      
      callback();
    });
  })
  .catch( reason => {
    console.error( 'onRejected function called: ', reason );
    callback();
  });
}

// account delegators count
// currently no cron
// TODO: needs work when implemented again
cron.schedule('0 3 * * *', updateDelegators);

function updateDelegators() {
  console.log('DELEGATORS: Started');

  // only accounts with more than 1 NANO delegated
  Account.find({ 'votingweight': { $gt: 133248289218203497353846153999000000 } })
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

function updateAccountDelegators(account, callback) {
  console.log('Updating delegators of', account.account)
  nano.rpc('delegators_count', { account: account.account })
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

function updateAccountDelegatorsExternal(account, callback) {
  console.log('DELEGATORS: Updating', account.account)

  rp({
    uri: 'https://api.nanocrawler.cc/v2/accounts/' + account.account + '/delegators',
    json: true
  })
    .then((data) => {
      console.log(account.account, Object.keys(data.delegators).length, 'delegators')

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