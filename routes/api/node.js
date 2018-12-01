var express = require('express');
const {
  Nano
} = require('nanode');

const nano = new Nano({
  url: process.env.NODE_RPC
});
var router = express.Router();

router.get('/version', function (req, res) {
  nano.rpc('version')
  .then(response => {
    if(!response) return res.status(404).json({ error: 'Not found' });

    res.json(response);
  })
  .catch(reason => {
    res.status(500).json({ error: 'Not found', msg: reason });
  });
});

module.exports = router;