const NanoNode = require('nano-node');
var Account = require('../models/account');
var queue = require('queue');
const request = require('request');

console.log('Using internal node at port ' + process.env.NODE_INTERNAL);

const node = new NanoNode(process.env.NODE_INTERNAL);
node.peers = ['5.189.128.113:7075', 'rai.raiblocks.net:7075'];
node.minimalConfirmAck = true;
node.maxPeers = 1000;

// caches all votes
var votes = {};

// stores the IPs we got votes from
var ipcache = [];

// stores the discovered monitors for checking
var monitors = [];

var q = queue({autostart: true, concurrency: 1, timeout: 30*1000});

node.on('vote', (msg, rinfo) => {
  var account = NanoNode.accountFromKey(msg.account);
  votes[account] = rinfo;

  checkForMonitor(account, rinfo.address);
});

node.on('error', error => {
  // console.log(error);
});


node.on('ready', () => {
  const address = node.client.address();
  console.log("Micronode listening to " + address.address + ":" + address.port);
  // Initial introduction
  node.publish({
    type: 'keepalive',
    versionMax: 0x0c,
    versionUsing: 0x07,
    versionMin: 0x01
  });
});

function addVoteToQueue(account, rinfo){
  q.push((cb) => {
    updateVote(cb, account, rinfo)
  });  
}

function updateVote(callback, myaccount, rinfo){
  Account.findOne(
    {
      'account': myaccount
    }, function (err, account) {
      if (err){
        callback();
        return;
      }

      if (!account) {
        var account = new Account();
        account.account = myaccount;
        account.network.ip = rinfo.address;
        account.network.port = rinfo.port;
      }

      if(!account.network.ip){
        account.network.ip = rinfo.address;
        account.network.port = rinfo.port;
      }

      account.lastVoted = Date.now();
      account.save(function (err) {
        if (err) {
          console.log("Node - updateVote - Error saving account", err);
        }
        callback();
      });

    });
}

function checkForMonitor(account, ipaddress){
  if(!ipcache.includes(ipaddress)){
    ipcache.push(ipaddress);

    request.get({
      url: 'http://' + ipaddress + '/api.php',
      json: true
    }, function (err, response, data) {
      if (err || response.statusCode !== 200 || data === undefined) {
        //console.log('No monitor at', ipaddress);
  
      } else if(data.nanoNodeAccount == account){
        console.log('Monitor found!', ipaddress, data.nanoNodeAccount);
        updateMonitor(account, ipaddress);

      } else if(data.nanoNodeAccount){
        console.log('Address mismatch', ipaddress, data.nanoNodeAccount, account);

        monitors.push({
          account: data.nanoNodeAccount,
          address: ipaddress
        });

        /*
        var index = ipcache.indexOf(ipaddress);
        if (index !== -1) ipcache.splice(index, 1);
        */
      }
    });
  } else if(monitors.some(e => e.account === account)){
    var monitorsIndex = monitors.findIndex(e => e.account === account);
    console.log('Monitor found! (via cache)', monitors[monitorsIndex].address, account);
    updateMonitor(account, ipaddress);

    monitors.splice(monitorsIndex, 1);
  }
}

function updateMonitor(myaccount, ipaddress){
  Account.findOne(
    {
      'account': myaccount
    }, function (err, account) {
      if (err || !account) return

      if(!account.monitor.url){
        account.monitor.url = 'http://'+ipaddress;
        console.log('Saved a new monitor!', myaccount, ipaddress);
      }

      account.save(function (err) {
        if (err) {
          console.log("Node - updateMonitor - Error saving account", err);
        }
      });

    }
  );
}

// Send keepalive at regular interval to known peers,
//  maxPeers will be reached very quickly
setInterval(() => {
  console.log('Sending keepalive to ' + node.peers.length + ' peers (' + node.peers[0] + ')');
  node.publish({
    type: 'keepalive',
    versionMax: 0x0c,
    versionUsing: 0x07,
    versionMin: 0x01
  });
}, 30000);

function getWaitTime(queue){
  return Math.round(queue / 100) + 30;
}

function clearVotes() {
  console.log(Object.keys(votes).length + " votes to process (Queue:" + q.length + ")");
  for (var vote in votes) {
    addVoteToQueue(vote, votes[vote]);    
  }
  votes = {};
  setTimeout(clearVotes, getWaitTime(q.length) * 1000);
}
clearVotes();

setInterval(() => {
  //console.log("Node Queue: "+ q.length);
}, 5* 1000);

module.exports = node;
