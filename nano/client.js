const {
  Nano
} = require('nanode');
var cron = require('node-cron');

const nano = new Nano({
  url: process.env.NODE_RPC
});

var available = 133248289218203497353846153999000000001;
var blockcount = 0;

function getAvailable(){
  return available;
}

function getBlockcount(){
  return blockcount;
}

function updateLocalVars(){
  updateBlockcount();
  updateAvailable();
}

function updateAvailable(){
  nano.available()
  .then((data) => {
    console.log(data);
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

// update the online nodes
cron.schedule('* * * * *', updateLocalVars);

// update the all local vars now
updateLocalVars();

module.exports = {
  rpc: nano, 
  getAvailable: getAvailable,
  getBlockcount: getBlockcount
};
