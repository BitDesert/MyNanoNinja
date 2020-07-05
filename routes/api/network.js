var express = require('express');

const NanoClient = require('nano-node-rpc');
const client = new NanoClient({url: process.env.NODE_RPC})

var router = express.Router();

router.get('/active_difficulty', function (req, res) {
  client._send('active_difficulty', { 
    "include_trend": "true"
   })
  .then(response => {
    if(!response) return res.status(404).json({ error: 'Not found' });

    res.json(response);
  })
  .catch(reason => {
    res.status(500).json({ error: 'Not found', msg: reason });
  });
});

router.get('/representatives_online', function (req, res) {
  client._send('representatives_online')
  .then(response => {
    if(!response) return res.status(404).json({ error: 'Not found' });

    res.json(response);
  })
  .catch(reason => {
    res.status(500).json({ error: 'Not found', msg: reason });
  });
});

module.exports = router;