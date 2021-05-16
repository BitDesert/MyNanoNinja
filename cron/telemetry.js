var cron = require('node-cron');
const Account = require('../models/account');
var tools = require('../tools');
var nanorpc = require('../nano/rpc_client');

const NanoClient = require('nano-node-rpc');
const client = new NanoClient({ url: process.env.NODE_RPC })

async function updateTelemetry() {
  var quorum = await client._send('confirmation_quorum', {
    peer_details: true
  })

  quorum.peers.forEach(async peer => {
    const regex_ip = /([\[0-9a-f.:\]]+):([0-9]+)/

    var match = peer.ip.match(regex_ip)

    const address = match[1]
    const port = match[2]

    var telemetry = await client._send('telemetry', {
      address,
      port
    })

    if (telemetry.error) {
      console.log('TELEMETRY: No telemetry from', peer.account, address, telemetry.error);
      return
    }

    var account = await Account.findOne({ account: peer.account })

    try {
      account.monitor.version = telemetry.major_version + '.' + telemetry.minor_version + '.' + telemetry.patch_version
      account.monitor.blocks = telemetry.block_count

      account.monitor.sync = tools.round((telemetry.block_count / nanorpc.getBlockcount()) * 100, 3)
      if (account.monitor.sync > 100) {
        account.monitor.sync = 100
      }

      account.telemetry.block_count = telemetry.block_count
      account.telemetry.cemented_count = telemetry.cemented_count
      account.telemetry.major_version = telemetry.major_version
      account.telemetry.minor_version = telemetry.minor_version
      account.telemetry.patch_version = telemetry.patch_version
      account.telemetry.protocol_version = telemetry.protocol_version
      account.telemetry.peer_count = telemetry.peer_count

      //console.log('TELEMETRY: OK from ', peer.account, telemetry.block_count);
    } catch (error) {
      console.log('TELEMETRY: Error at ', peer.account, error);
    }

    account.save()
  });
}

cron.schedule('*/5 * * * *', updateTelemetry);
updateTelemetry()