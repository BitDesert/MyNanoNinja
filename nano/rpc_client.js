const {
  Nano
} = require('nanode');
var cron = require('node-cron');

const nano = new Nano({
  url: process.env.NODE_RPC
});

var available = 133248289218203497353846153999000000001;
var online_stake_total = 111073634713394802707654827519888461987;
var blockcount = 0;

function getAvailable(){
  return available;
}

function getOnlineStakeTotal(){
  return online_stake_total;
}

function getBlockcount(){
  return blockcount;
}

// update all local vars
cron.schedule('* * * * *', updateLocalVars);

// update the all local vars now
updateLocalVars();

function updateLocalVars(){
  updateBlockcount();
  updateAvailable();
  updateOnlineStakeTotal();
}

function updateAvailable(){
  nano.available()
  .then((data) => {
    available = data;
    console.log('RPC: Available Supply: ' + available);
  })
  .catch( reason => {
    console.error( 'onRejected function called: ', reason );
  });
}

function updateBlockcount(){
  console.log('RPC: Updating Blockcount...');
  nano.blocks.count()
  .then((blocks) => {
    blockcount = blocks.count;
    console.log('RPC: Current Blockcount: ' + blockcount);
  })
  .catch( reason => {
    console.error( 'onRejected function called: ', reason );
  });
}

function updateOnlineStakeTotal(){
  console.log('RPC: Updating online_stake_total...');
  nano.rpc("confirmation_quorum")
  .then((result) => {
    online_stake_total = result.online_stake_total;
    console.log('RPC: Current online_stake_total: ' + online_stake_total);
  })
  .catch( reason => {
    console.error( 'onRejected function called: ', reason );
  });
}

module.exports = {
  rpc: nano, 
  getAvailable: getAvailable,
  getOnlineStakeTotal: getOnlineStakeTotal,
  getBlockcount: getBlockcount
};
