var express = require('express');
var router = express.Router();

var Account = require('../models/account');

const opencap_regex = /([a-z0-9._-]+)\$.*/

/* GET users listing. */
router.get('/addresses', function (req, res, next) {

  var alias = req.query.alias.match(opencap_regex)

  if (alias === null) {
    res.status(400).json({
      "message": "Not a valid alias",
    });
    return;
  }

  Account.findOne({
      'slug': alias
    })
    .exec(function (err, account) {
      if (err || !account) {
        // Not found
        res.status(404).json({
          "message": "Account not found",
        });
        return;
      }
      res.json({
        "address_type": 300,
        "address": account.account,
        "extensions": {}
      });
    });
});

module.exports = router;