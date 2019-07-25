const {
  Nano
} = require('nanode');
var Account = require('../models/account');
var moment = require('moment');
var cron = require('node-cron');

const nano = new Nano({
  url: process.env.NODE_RPC
});

var available = 133248289218203497353846153999000000001;
var nodesOnline_all = 0;
var nodesOnline_rebroad = 0;
var blockcount = 0;

function getAvailable(){
  return available;
}

function getNodesOnline(){
  return nodesOnline_all;
}

function getNodesOnlineRebroad(){
  return nodesOnline_rebroad;
}

function getBlockcount(){
  return blockcount;
}

function getQueueLength(){
  return q.length;
}

function updateLocalVars(){
  updateBlockcount();
  updateNodesOnline();
  updateAvailable();
}

function updateAvailable(){
  nano.available()
  .then((data) => {
    available = data;
    console.log('Available Supply: ' + available);
  })
  .catch( reason => {
    console.error( 'onRejected function called: ', reason );
  });
}

function updateBlockcount(){
  console.log('Updating Blockcount...');
  nano.blocks.count()
  .then((blocks) => {
    blockcount = blocks.count;
    console.log('Current Blockcount: ' + blockcount);
  })
  .catch( reason => {
    console.error( 'onRejected function called: ', reason );
  });
}

function updateNodesOnline(){
  // ALL REPRESENTATIVES
  Account.find({
    lastVoted: {$gt: moment().subtract(30, 'minutes').toDate()}
  })
  .where('votingweight').gt(0)
  .exec(function (err, nodes) {
    if(err) return
    nodesOnline_all = nodes.length;
    console.log(nodesOnline_all + ' reps are online');
  });

  // WITH OVER 0.1%
  Account.find({
    votingweight: {$gte: 133248289218203497353846153999000000},
    lastVoted: {$gt: moment().subtract(30, 'minutes').toDate()}
  })
  .where('votingweight').gt(0)
  .exec(function (err, nodes) {
    if(err) return
    nodesOnline_rebroad = nodes.length;
    console.log(nodesOnline_rebroad + ' reps over 0.1% are online');
  });
}

// update all local vars
cron.schedule('* * * * *', updateLocalVars);

// update account delegators
// just too slow, disabled for now
//cron.schedule('0 */3 * * *', updateDelegators);

// update the all local vars now
updateLocalVars();

module.exports = {
  rpc: nano, 
  getAvailable: getAvailable,
  getNodesOnline: getNodesOnline,
  getNodesOnlineRebroad: getNodesOnlineRebroad,
  getQueueLength: getQueueLength,
  getBlockcount: getBlockcount
};
