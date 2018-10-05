const {
  Nano
} = require('nanode');
var Account = require('../models/account');
var moment = require('moment');
var queue = require('queue');
var cron = require('node-cron');

const nano = new Nano({
  url: process.env.NODE_RPC
});
var q = queue({autostart: true, concurrency: 1, timeout: 20*1000});

q.on('timeout', function (next, job) {
  console.log('job timed out:', job.toString().replace(/\n/g, ''))
  next()
})

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

function updateRepresentatives(){
  nano.representatives().then((reps) => {
    for (var rep in reps) {
      checkRepresentativeQueue(rep, reps[rep]);
    }
  });
}

function checkRepresentativeQueue(rep, weight){
  q.push((cb) => {
    checkRepresentative(cb, rep, weight)
  });  
}

function checkRepresentative(cb, rep, weight){
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

function updateDelegators() {
  console.log('Updating Delegators...');
  if(q.length > 1000){
    console.log('Queue is full ('+q.length+')');
    //return;
  }

  Account.find({'votingweight': {$gt:0}})
  .exec(function (err, accounts) {
    for (var i = 0; i < accounts.length; i++) {
      updateAccountDelegatorsQueue(accounts[i]);    
    }
  });
}

function updateAccountDelegatorsQueue(account){
  q.push((cb) => {
    updateAccountDelegators(cb, account);
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

// WEIGHTS

function updateWeights() {
  console.log('Updating Weights...');
  if(q.length > 1000){
    console.log('Queue is full ('+q.length+')');
    return;
  }

  Account.find().exec(function (err, nodes) {
    for (var i = 0; i < nodes.length; i++) {
      updateAccountWeightQueue(nodes[i]);    
    }
  });

  nano.available().then((res) => {
    available = res;
  });
}

function updateAccountWeightQueue(node){
  q.push((cb) => {
    // console.log(cb, node)
    updateAccountWeight(cb, node);
  });  
}

function updateAccountWeight(callback, account){
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
    callback(false);
  });
}

// update the online nodes
cron.schedule('* * * * *', updateLocalVars);

// update account weights
cron.schedule('*/15 * * * *', updateWeights);

// update account delegators
cron.schedule('0 */3 * * *', updateDelegators);

// get all representatives
cron.schedule('0 * * * *', updateRepresentatives);

// update the all local vars now
updateLocalVars();

setInterval(() => {
  console.log("RPC Queue: "+ q.length);
}, 5* 1000);


module.exports = {
  rpc: nano, 
  getAvailable: getAvailable,
  getNodesOnline: getNodesOnline,
  getNodesOnlineRebroad: getNodesOnlineRebroad,
  getQueueLength: getQueueLength,
  getBlockcount: getBlockcount
};