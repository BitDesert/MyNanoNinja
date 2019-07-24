var cron = require('node-cron');
var async = require("async");
var maxmind = require('maxmind');
var geo_asn = maxmind.openSync('./utils/GeoLite2-ASN.mmdb');
var geo_city = maxmind.openSync('./utils/GeoLite2-City.mmdb');

const regex_ip = /\[::ffff:([0-9.]+)\]:[0-9]+/

const {
  Nano
} = require('nanode');

const node = new Nano({
  url: process.env.NODE_RPC
});

var Account = require('../models/account');

function updatePeers() {
  console.log('== Updating Peers...');

  node.rpc('confirmation_quorum', {
    peer_details: true
  })
    .then(response => {
      if (!response) return;

      async.forEachOfSeries(response.peers, (peer, key, callback) => {

        var match = regex_ip.exec(peer.ip)
        
        if (match) {
            updatePeer(peer, match[1], callback)
        } else {
          callback()
        }

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('== Peers updated.');
      });
    })
    .catch(reason => {
      console.error(reason);
    });
}

function updatePeer(peer, ip, callback) {
  Account.findOne(
    {
      'account': peer.account
    }, function (err, account) {
      if (err || !account){
        callback()
        return;
      }

      try {
        account.network.ip = ip;

        var geo_asn_response = geo_asn.get(ip);

        if(geo_asn_response && geo_asn_response.autonomous_system_organization){
          account.network.provider = geo_asn_response.autonomous_system_organization;
        }

        var geo_city_response = geo_city.get(ip);

        if(geo_city_response){
          account.location.country = geo_city_response.country.iso_code;
  
          if(geo_city_response.city){
            account.location.city = geo_city_response.city.names.en;
          }
  
          account.location.latitude = geo_city_response.location.latitude;
          account.location.longitude = geo_city_response.location.longitude;
        } else {
          console.log('No city for ' + peer.ip + ' / ' + peer.account)
        }
        
        account.save(function (err) {
          if (err) {
            console.log("CRON - updatePeer - Error saving account", err);
          }
          callback()
        });
      } catch (error) {
        console.error(error, peer);
        callback()
      }
    });
}

cron.schedule('*/5 * * * *', updatePeers);
updatePeers();