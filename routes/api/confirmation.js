var express = require('express');
var moment = require('moment');
const {
  Nano
} = require('nanode');

const nano = new Nano({
  url: process.env.NODE_RPC
});
var router = express.Router();

router.get('/active', function (req, res) {
  nano.rpc('confirmation_active')
  .then(response => {
    if(!response) return res.status(404).json({ error: 'Not found' });

    res.json(response);
  })
  .catch(reason => {
    res.status(500).json({ error: 'Not found', msg: reason });
  });
});

router.get('/history', function (req, res) {
  nano.rpc('confirmation_history')
  .then(response => {
    if(!response) return res.status(404).json({ error: 'Not found' });

    res.json(response);
  })
  .catch(reason => {
    res.status(500).json({ error: 'Not found', msg: reason });
  });
});

router.get('/quorum', function (req, res) {
  nano.rpc('confirmation_quorum', {
    peer_details: true
  })
  .then(response => {
    if(!response) return res.status(404).json({ error: 'Not found' });

    res.json(response);
  })
  .catch(reason => {
    res.status(500).json({ error: 'Not found', msg: reason });
  });
});

router.get('/:block', function (req, res) {
  nano.rpc('confirmation_info', { 
    root: req.params.block,
    representatives: 'true'
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