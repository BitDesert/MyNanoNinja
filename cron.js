module.exports = function (nanorpc) {
  var cron = require('node-cron');
  var moment = require('moment');
  var async = require("async");
  const nodemailer = require('nodemailer');
  var request = require('request');
  var tools = require('./tools');

  var Account = require('./models/account');
  var Check = require('./models/check');

  let transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true, // upgrade later with STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
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
        console.log(accounts.length + " accounts");

        for (var i = 0; i < accounts.length; i++) {
          checkNodeUptime(accounts[i]);
        }
      });
  }

  function checkNodeUptime(account) {
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

  cron.schedule('*/5 * * * *', updateNodeMonitors);

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

        for (var i = 0; i < accounts.length; i++) {
          updateNodeMonitor(accounts[i]);
        }
      });
  }

  function updateNodeMonitor(account) {
    request.get({
      url: account.monitor.url + '/api.php',
      json: true
    }, function (err, response, data) {
      try {
        if (err || response.statusCode !== 200) {
          console.log('CRON - updateNodeMonitor - Could not contact monitor for ' + account.account);
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
        });
      } catch (error) {
        console.error('Problem with updateNodeMonitor')
      }
    });
  }

  /*
   * Fallback rep vote via RPC
   */

  cron.schedule('*/1 * * * *', updateOnlineRepsRPC);
  //cron.schedule('*/1 * * * *', updateUptimeDistributed);

  function updateOnlineRepsRPC() {
    console.log('Updating Uptime via RPC...');
    nanorpc.rpc.rpc('representatives_online').then(function (reps) {
      for (var rep of reps.representatives) {
        updateVoteSimple(rep);
      };

    });
  }

  function updateUptimeDistributed() {
    console.log('Updating Uptime via distributed RPC...');

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

      for (var rep of onlinereps) {
        updateVoteSimple(rep);
      };
    });
  }

  function updateVoteSimple(myaccount) {
    Account.findOne(
      {
        'account': myaccount
      }, function (err, account) {
        if (err) {
          return;
        }

        if (!account) {
          var account = new Account();
          account.account = myaccount;
        }

        account.lastVoted = Date.now();
        account.save(function (err) {
          if (err) {
            console.log("Cron - updateVoteSimple - Error saving account", err);
          }
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
        console.log(accounts.length + " accounts");

        for (var i = 0; i < accounts.length; i++) {
          updateScoreAccount(accounts[i]);
        }
      });
  }

  function updateScoreAccount(account) {
    // initial score    
    var score = 0;

    // calculate weight score
    var weightpercent = (account.votingweight / nanorpc.getAvailable()) * 100;

    score = score + 100 / (1 + Math.exp(20 * weightpercent - 15));

    // calculate uptime score
    score = score + Math.pow(10, -6) * Math.pow(account.uptime, 4);

    // calculate days since creation score
    var dayssincecreation = moment().diff(moment(account.created), 'days');
    score = score + (100 + (-100 / (1 + Math.pow(dayssincecreation / 100, 4))));

    // divide through the score count so we get a smooth max 100 points
    score = score / 3;

    // round the final score
    account.score = Math.round(score);
    //console.log(account.account + ": " + account.score);

    account.save(function (err) {
      if (err) {
        console.log("Cron - updateScoreAccount - Error saving account", err);
      }
    });
  }

  cron.schedule('*/10 * * * *', updateScore);
  //updateScore();

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

  cron.schedule('0 * * * *', updateUptime);

} // end exports
