module.exports = function (nanorpc) {
  var cron = require('node-cron');
  var moment = require('moment');
  var async = require("async");
  const nodemailer = require('nodemailer');
  var request = require('request');

  var Account = require('./models/account');
  var Statistics = require('./models/statistics');
  var StatisticsVersions = require('./models/statisticsVersions');
  var StatisticsBlockcounts = require('./models/statisticsBlockcounts');

  let transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true, // upgrade later with STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  function round(value, precision) {
    if (Number.isInteger(precision)) {
      var shift = Math.pow(10, precision);
      return Math.round(value * shift) / shift;
    } else {
      return Math.round(value);
    }
  }

  function median(values) {

    values.sort( function(a,b) {return a - b;} );
  
    var half = Math.floor(values.length/2);
  
    if(values.length % 2)
        return values[half];
    else
        return (values[half-1] + values[half]) / 2.0;
  }

  /*
   * Statistics / Representatives
   */

  cron.schedule('*/15 * * * *', updateStatistics);
  //cron.schedule('*/10 * * * * *', updateStatisticsBlockcounts);

  function updateStatistics() {
    console.log('Updating Statistics...');
    updateStatisticsUptime();
    updateStatisticsVersions();
    updateStatisticsBlockcounts();
  }

  function updateStatisticsUptime() {

    var obj = {
      total: {
        votingweight: {
          $gte: 0
        }
      },
      eligible: {
        votingweight: {
          $gte: 133248289218203497353846153999000000
        }
      }, // more than 0.1 %
      online: {
        lastVoted: {
          $gt: moment().subtract(15, 'minutes').toDate()
        },
        votingweight: {
          $gte: 0
        }
      },
    };

    var repstats = {};

    async.forEachOf(obj, (value, key, callback) => {
      Account.find(value)
        .exec(function (err, accounts) {
          if (err) {
            console.error(err);
            callback(false);
            return;
          }
          repstats[key] = accounts.length;
          callback();
        });
    }, err => {
      if (err) {
        console.error(err.message);
        return
      }
      var stats = new Statistics();
      stats.representatives = repstats;
      stats.save(function (err) {
        if (err) {
          console.error('CRON - updateStatistics - ', err);
          return
        }
      })
    });
  }

  /*
   * Statistics - Node Versions
   */

  function updateStatisticsVersions() {
    nanorpc.rpc.rpc('peers').then(function (peers) {

      var stats = new StatisticsVersions();

      for (var peer in peers.peers) {
        stats.nodeversions[peers.peers[peer]]++;
      }

      console.log(stats);

      stats.save(function (err) {
        if (err) {
          console.error('CRON - updateStatistics - ', err);
          return
        }
        console.log('updateStatisticsVersions done');
      })

    });
  }

  /*
   * Statistics - Blockcounts
   */

  function updateStatisticsBlockcounts() {
    Account.find({
      'monitor.url': {
        $exists: true,
        $ne: null
      },
      'monitor.blocks': {
        $exists: true,
        $ne: null
      }
    })
    .select('-_id account monitor')
    .sort('-monitor.blocks')
    .exec(function (err, accounts) {
      if (err) {
        return;
      }
      var stats = new StatisticsBlockcounts();

      var blockcounts = [];
      for (var account in accounts) {
        blockcounts.push(accounts[account].monitor.blocks);
      }

      var medianblockcount = median(blockcounts);

      for (var account in accounts) {
        if(accounts[account].monitor.blocks > medianblockcount - 10000){
          stats.blockcounts.push({
            account: accounts[account].account,
            count: accounts[account].monitor.blocks
          });
        }
      }

      stats.save(function (err) {
        if (err) {
          console.error('CRON - updateStatistics - ', err);
          return
        }
      })
  
    });
  }

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
          account.monitor.sync = round((data.currentBlock / nanorpc.getBlockcount()) * 100, 3);
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

  cron.schedule('*/10 * * * *', updateOnlineRepsRPC);
  cron.schedule('*/10 * * * *', updateUptimeDistributed);

  function updateOnlineRepsRPC() {
    console.log('Updating Uptime via RPC...');
    nanorpc.rpc.rpc('representatives_online').then(function (reps) {
      for (var rep in reps.representatives) {
        updateVoteSimple(rep);
      };
  
    });
  }

  function updateUptimeDistributed() {
    console.log('Updating Uptime via distributed RPC...');

    var provider = [
      'https://www.repnode.org/api/representatives-online.php',
      'http://66.228.51.21:8500/representatives-online'
    ];
  
    var onlinereps = [];
  
    async.forEachOf(provider, (value, key, callback) => {
  
      request.get({
        url: value,
        json: true
      }, function (err, response, data) {
        if(err){
          // error getting data
          console.error('updateUptimeDistributed', err);
          callback();
          return;
        }
        for (var rep in data.representatives) {
          if (!onlinereps.includes(rep)) {
            onlinereps.push(rep)
          }
        };
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

} // end exports