

var request = require('request');
var async = require("async");
var cron = require('node-cron');

var tools = require('../tools');
var nanorpc = require('../nano/rpc_client');

var Account = require('../models/account');

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
      console.error('MONITORS: Problem with updateNodeMonitor', account.monitor.url, error.message)
      callback();
    }
  });
}