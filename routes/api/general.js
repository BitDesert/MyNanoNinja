var express = require('express');
var router = express.Router();

var protomap = require('../../nano/protomap');

router.get('/protomap', function (req, res) {
  res.json(protomap);
});

module.exports = router;