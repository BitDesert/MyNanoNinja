var cron = require('node-cron');
const Account = require('../models/account');
var tools = require('../tools');
var nanorpc = require('../nano/rpc_client');

const NanoClient = require('nano-node-rpc');
const client = new NanoClient({url: process.env.NODE_RPC})

async function updateTelemetry(){
  var quorum = await client._send('confirmation_quorum', {
    peer_details: true
  })

  quorum.peers.forEach(async peer => {
    const regex_ip = /([\[0-9a-f.:\]]+):([0-9]+)/

    var match = peer.ip.match(regex_ip)

    var telemetry = await client._send('telemetry', {
      address: match[1],
      port: match[2]
    })

    if(telemetry.error) return
    
    var account = await Account.findOne({account: peer.account})

    account.monitor.version = telemetry.major_version + '.' + telemetry.minor_version + '.' + telemetry.patch_version
    account.monitor.blocks = telemetry.block_count

    account.monitor.sync = tools.round((telemetry.block_count / nanorpc.getBlockcount()) * 100, 3)
    if (account.monitor.sync > 100) {
      account.monitor.sync = 100
    }    

    account.save()
  });  
}

cron.schedule('*/15 * * * *', updateTelemetry);
updateTelemetry()