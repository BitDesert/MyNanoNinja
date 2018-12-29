var cron = require('node-cron');
var maxmind = require('maxmind');
var geo_asn = maxmind.openSync('./utils/GeoLite2-ASN.mmdb');
var geo_city = maxmind.openSync('./utils/GeoLite2-City.mmdb');

const {
  Nano
} = require('nanode');

const node = new Nano({
  url: process.env.NODE_RPC
});

var Account = require('../models/account');

function updatePeers() {
  console.log('Updating Peers...');

  node.rpc('confirmation_quorum', {
    peer_details: true
  })
    .then(response => {
      if (!response) return;

      for (const peer of response.peers) {
        updatePeer(peer)
      }
    })
    .catch(reason => {
      console.error(reason);
    });
}

function updatePeer(peer) {
  Account.findOne(
    {
      'account': peer.account
    }, function (err, account) {
      if (err || !account) return;

      try {
        account.network.ip = peer.ip;

        var geo_asn_response = geo_asn.get(peer.ip);

        if(geo_asn_response.autonomous_system_organization){
          account.network.provider = geo_asn_response.autonomous_system_organization;
        }

        var geo_city_response = geo_city.get(peer.ip);

        account.location.country = geo_city_response.country.iso_code;

        if(geo_city_response.city){
          account.location.city = geo_city_response.city.names.en;
        }

        account.location.latitude = geo_city_response.location.latitude;
        account.location.longitude = geo_city_response.location.longitude;

        account.save(function (err) {
          if (err) {
            console.log("CRON - updatePeer - Error saving account", err);
          }
        });
      } catch (error) {
        console.error(error);
      }
    });
}

cron.schedule('*/5 * * * *', updatePeers);
updatePeers();