var express = require('express');
var moment = require('moment');

const NanoClient = require('nano-node-rpc');
const client = new NanoClient({url: process.env.NODE_RPC})

var router = express.Router();

router.get('/:block', function (req, res) {
  client._send('blocks_info', { 
    hashes: [req.params.block],
    source: true,
    pending: true,
    balance: true
   })
  .then(response => {
    if(!response) return res.status(404).json({ error: 'Not found' });

    let response_raw = response.blocks;

    let block = response_raw[req.params.block];

    block.contents = JSON.parse(block.contents);

    res.json(block);
  })
  .catch(reason => {
    res.status(500).json({ error: 'Not found', msg: reason });
  });
});

module.exports = router;