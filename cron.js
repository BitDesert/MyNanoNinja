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
const nodemailer = require('nodemailer');
var request = require('request');
var tools = require('./tools');

// cron subtasks
require('./cron/peers');
require('./cron/statistics');

// mail
let transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true, // upgrade later with STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const nano = new Nano({
  url: process.env.NODE_RPC
});

/*
 * Node Uptime 
 */

function updateNodeUptime() {
  console.log('Updating Node Uptime...');
  Account.find()
    .where('votingweight').gt(0)
    .populate('owner')
    .exec(function (err, accounts) {
      if (err) {
        console.error('CRON - updateNodeUptime', err);
        return
      }
      console.log('== Uptime: ' + accounts.length + " accounts");

      async.forEachOfSeries(accounts, (account, key, callback) => {

        checkNodeUptime(account, callback);

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('== Uptime updated.');
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

  if (account.alias) {
    var title = account.alias;
  } else {
    var title = account.account;
  }

  if (account.owner && process.env.NODE_ENV != 'development') {
    if (previous === true && account.uptime_data.last === false) {
      console.log(account.account + ' went down!');

      account.owner.getEmails().forEach(function (email) {
        sendDownMail(account, email);
      });

    } else if (previous === false && account.uptime_data.last === true) {
      console.log(account.account + ' went up!');

      account.owner.getEmails().forEach(function (email) {
        sendUpMail(account, email);
      });
    }
  }

  account.save(function (err) {
    if (err) {
      console.log("CRON - checkNodeUptime - Error saving account", err);
    }
    account.updateUptimeFor('day')
    callback();
  });
}

cron.schedule('*/30 * * * *', updateNodeUptime);

function sendUpMail(account, email) {

  if (account.alias) {
    var title = account.alias;
  } else {
    var title = account.account;
  }

  if (account.lastVoted) {
    var lastvote = 'Last voted ' + moment(account.lastVoted).fromNow();
  } else {
    var lastvote = 'Never noted';
  }

  var body = 'The Nano representative ' + title + ' is up again.<br>' +
    lastvote + '.<br>' +
    'Address: ' + account.account + '<br><br>' +
    '<a href="https://mynano.ninja/account/' + account.account + '">View on My Nano Ninja</a>'

  sendMail('UP: ' + title, body, email);
}

function sendDownMail(account, email) {

  if (account.alias) {
    var title = account.alias;
  } else {
    var title = account.account;
  }

  if (account.lastVoted) {
    var lastvote = 'Last voted ' + moment(account.lastVoted).fromNow();
  } else {
    var lastvote = 'Never noted';
  }

  var body = 'The Nano representative ' + title + ' is down.<br>' +
    lastvote + '.<br>' +
    'Address: ' + account.account + '<br><br>' +
    '<a href="https://mynano.ninja/account/' + account.account + '">View on My Nano Ninja</a>'

  sendMail('DOWN: ' + title, body, email);
}

function sendMail(subject, body, email) {
  var data = {
    from: 'My Nano Ninja <alert@mynano.ninja>',
    to: email,
    subject: subject,
    html: body
  }
  transporter.sendMail(data);
}

/*
 * UPDATE NODE MONITORS
 */

cron.schedule('*/15 * * * *', updateNodeMonitors);

function updateNodeMonitors() {
  Account.find({
    'monitor.url': {
      $exists: true,
      $ne: null
    }
  })
    .exec(function (err, accounts) {
      if (err) {
        console.error('CRON - updateNodeMonitors', err);
        return
      }
      console.log(accounts.length + " accounts with a monitor");

      async.eachOfLimit(accounts, 4, (account, key, callback) => {

        updateNodeMonitor(account, callback);

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('== Monitors updated.');
      });
    });
}

function updateNodeMonitor(account, callback) {  
  request.get({
    url: account.monitor.url + '/api.php',
    json: true,
    timeout: 10
  }, function (err, response, data) {
    try {
      if (err || response.statusCode !== 200) {
        console.log('CRON - updateNodeMonitor - Could not contact monitor for ' + account.account);
        callback();
        return;

      } else if (data.nanoNodeAccount != account.account) {

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
          console.error('CRON - updateNodeMonitor', err);
        }
        callback();
      });
    } catch (error) {
      console.error('Problem with updateNodeMonitor')
      callback();
    }
  });
}

/*
 * Fallback rep vote via RPC
 */

cron.schedule('*/1 * * * *', updateOnlineRepsRPC);
cron.schedule('*/1 * * * *', updateUptimeDistributed);

updateOnlineRepsRPC()
updateUptimeDistributed()
function updateOnlineRepsRPC() {
  console.log('Updating Votes via RPC...');
  nano.rpc('representatives_online').then(function (reps) {
    console.log('== Votes: ' + reps.representatives.length + " reps are online");

    async.forEachOfSeries(reps.representatives, (rep, key, callback) => {
      
      updateVoteSimple(rep, callback);

    }, err => {
      if (err) {
        console.error(err.message);
        return
      }
      console.log('== Votes updated.');
    });

  });
}

function updateUptimeDistributed() {
  console.log('Updating Votes via distributed RPC...');

  var provider = JSON.parse(process.env.DRPC_REPSONLINE);

  var onlinereps = [];

  async.forEachOf(provider, (value, key, callback) => {

    request.get({
      url: value,
      json: true
    }, function (err, response, data) {
      if (err) {
        // error getting data
        console.error('updateUptimeDistributed', err);
        callback();
        return;
      }

      try {
        for (var rep of data.representatives) {
          if (!onlinereps.includes(rep)) {
            onlinereps.push(rep)
          }
        };
      } catch (error) {
        console.error(error);
      }
      callback()
    });


  }, err => {
    if (err) {
      console.error(err.message);
      return
    }
    console.log(onlinereps.length + ' reps via dRPC');

    async.forEachOfSeries(onlinereps, (rep, key, callback) => {
      
      updateVoteSimple(rep, callback);

    }, err => {
      if (err) {
        console.error(err.message);
        return
      }
      console.log('== Votes updated via dRPC.');
    });
  });
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
          console.log("Cron - updateVoteSimple - Error saving account", err);
        }
        callback();
      });

    });
}

function updateScore() {
  console.log('Updating Scores...');
  Account.find()
    .where('votingweight').gt(0)
    .exec(function (err, accounts) {
      if (err) {
        console.error('CRON - updateScore', err);
        return
      }
      console.log('== Score: ' + accounts.length + " accounts");

      async.forEachOfSeries(accounts, (account, key, callback) => {

        updateScoreAccount(account, callback)

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('== Scores updated');
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
      console.log("Cron - updateScoreAccount - Error saving account", err);
    }
    callback();
  });
}

cron.schedule('5 * * * *', updateScore);
//updateScore();

// Uptime tracking
cron.schedule('0 * * * *', updateUptime);

function updateUptime() {
  console.log('== Updating Uptime...');
  Account.find()
    .where('votingweight').gt(0)
    .exec(function (err, accounts) {
      if (err) {
        console.error('CRON - updateUptime', err);
        return
      }
      console.log('== Uptime: ' + accounts.length + " accounts");

      async.forEachOfSeries(accounts, (account, key, callback) => {

        updateUptimeAccount(account, callback)

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('== Uptime updated.');
      });
    });
}

function updateUptimeAccount(account, callback) {
  var types = ['week', 'month', 'year'];

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
  console.log('== Updating Representatives...');
  
  nano.representatives().then((reps) => {

    async.forEachOfSeries(reps, (weight, rep, callback) => {
      
      checkRepresentative(rep, weight, callback)

    }, err => {
      if (err) {
        console.error(err.message);
        return
      }
      console.log('== Representatives updated.');
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
  console.log('== Updating Weights...');

  Account.find().exec(function (err, accounts) {

      async.forEachOfSeries(accounts, (account, key, callback) => {
    
        updateAccountWeight(account, callback);
    
      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('== Weights updated.');
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
function updateDelegators() {
  console.log('Updating Delegators...');
  if(q.length > 1000){
    console.log('Queue is full ('+q.length+')');
    //return;
  }

  // only accounts with more than 1 NANO delegated
  Account.find({'votingweight': {$gt:1000000000000000000000000000000}})
  .exec(function (err, accounts) {
    console.log('Reps found: '+accounts.length);
    
    for (var i = 0; i < accounts.length; i++) {
      updateAccountDelegatorsQueue(accounts[i]);    
    }
  });
}

function updateAccountDelegators(callback, account){
  nano.rpc('delegators_count', { account: account.account })
  .then((delegators) => {

    account.delegators = delegators.count;

    account.save(function (err) {
      if (err) {
        console.log("RPC - updateAccountDelegators - Error saving account", err);
      }
      callback();
    });
  })
  .catch( reason => {
    console.error( 'onRejected function called: ', reason );
    callback(false);
  });
}