var cron = require('node-cron');

const NanoClient = require('nano-node-rpc');
const client = new NanoClient({url: process.env.NODE_RPC})

var available = 133248289218203497353846153999000000001;
var online_stake_total = 115202418863627145255311728515410020648;
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
  client.available_supply()
  .then((data) => {    
    available = data.available;
    console.log('RPC: Available Supply: ' + available);
  })
  .catch( reason => {
    console.error( 'onRejected function called: ', reason );
  });
}

function updateBlockcount(){
  console.log('RPC: Updating Blockcount...');
  client.block_count()
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
  client._send("confirmation_quorum")
  .then((result) => {
    online_stake_total = result.online_stake_total;
    console.log('RPC: Current online_stake_total: ' + online_stake_total);
  })
  .catch( reason => {
    console.error( 'onRejected function called: ', reason );
  });
}

module.exports = {
  getAvailable: getAvailable,
  getOnlineStakeTotal: getOnlineStakeTotal,
  getBlockcount: getBlockcount
};
