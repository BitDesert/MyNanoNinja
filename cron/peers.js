var cron = require('node-cron');
var async = require("async");
var _ = require('lodash');
var request = require('request');
var protomap = require('../nano/protomap');
var maxmind = require('maxmind');
var geo_asn = maxmind.openSync('./utils/maxmind/GeoLite2-ASN.mmdb');
var geo_city = maxmind.openSync('./utils/maxmind/GeoLite2-City.mmdb');

const regex_ip = /\[::ffff:([0-9.]+)\]:[0-9]+/

const NanoClient = require('nano-node-rpc');
const client = new NanoClient({url: process.env.NODE_RPC})

var Account = require('../models/account');

cron.schedule('*/5 * * * *', updatePeers);
updatePeers();

function updatePeers() {
  console.log('PEERS: Started');

  getAdvancedPeers().then((peers) => {

    async.forEachOfSeries(peers, (peer, key, callback) => {

      var match = regex_ip.exec(peer.ip)

      if (match) {
        updatePeer(peer.account, match[1], peer.protocol_version, callback)
        checkForMonitor(peer.account, match[1]);
      } else {
        callback()
      }

    }, err => {
      if (err) {
        console.error(err.message);
        return
      }
      console.log('PEERS: Done');
    });
  })

}

async function getAdvancedPeers() {
  const quorumPeers = (await client._send("confirmation_quorum", {
    peer_details: true
  })).peers;

  const allPeers = (await client._send("peers", { peer_details: true }))
    .peers;

  return _.map(allPeers, (peer, address) => {
    const repInfo = quorumPeers.find(p => p.ip === address);

    return {
      ip: address,
      account: repInfo ? repInfo.account : null,
      weight: repInfo ? repInfo.weight : null,
      protocol_version: peer.protocol_version,
      type: peer.type
    };
  }).filter(peer => peer.account !== null);

}

function updatePeer(peeraccount, ip, protoversion, callback) {  
  Account.findOne(
    {
      'account': peeraccount
    }, function (err, account) {
      if (err || !account) {
        callback()
        return;
      }

      try {
        account.network.ip = ip;

        var geo_asn_response = geo_asn.get(ip);        

        if (geo_asn_response && geo_asn_response.autonomous_system_organization) {
          account.network.provider = geo_asn_response.autonomous_system_organization;
        }

        var geo_city_response = geo_city.get(ip);

        if (geo_city_response) {
          account.location.country = geo_city_response.country.iso_code;

          if (geo_city_response.city) {
            account.location.city = geo_city_response.city.names.en;
          }

          account.location.latitude = geo_city_response.location.latitude;
          account.location.longitude = geo_city_response.location.longitude;
        } else {
          console.log('PEERS: No city for ' + ip + ' / ' + peeraccount)
        }

        var nodeversion = protomap[protoversion];
        if (nodeversion && !account.monitor.url) {
          account.monitor.version = protomap[protoversion];
          //console.log('Update Node Version without Monitor: ', account.monitor.version, account.account);

        }

        account.save(function (err) {
          if (err) {
            console.log("PEERS: updatePeer - Error saving account", err);
          }
          callback()
        });
      } catch (error) {
        console.error('PEERS: ', error, peeraccount);
        callback()
      }
    });
}


function checkForMonitor(account, ipaddress){
  try {
    request.get({
      url: 'http://' + ipaddress + '/api.php',
      json: true,
      timeout: 10000
    }, function (err, response, data) {
      if (err || response.statusCode !== 200 || data === undefined) {
        // console.log('No monitor at', ipaddress);
        return;
      }

      if(!data.nanoNodeAccount) return
        
      // check for old prefix
      var nanoNodeAccount = data.nanoNodeAccount;
      if ((nanoNodeAccount.startsWith('xrb_1') || nanoNodeAccount.startsWith('xrb_3')) && nanoNodeAccount.length === 64) {
        nanoNodeAccount = 'nano_' + nanoNodeAccount.substring(4,64);
      }

      if(nanoNodeAccount == account){
        //console.log('PEERS: Monitor found!', ipaddress, nanoNodeAccount);
        updateMonitor(account, ipaddress);

      } else if(nanoNodeAccount){
        //console.log('PEERS: Address mismatch', ipaddress, nanoNodeAccount, account);
      }
    });
    
  } catch (error) {
    console.log('PEERS: checkForMonitor - ', error)
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
        console.log('PEERS: Saved a new monitor!', myaccount, ipaddress);
      }

      account.save(function (err) {
        if (err) {
          console.log("Node - updateMonitor - Error saving account", err);
        }
      });

    }
  );
}