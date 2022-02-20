module.exports = function (nanorpc) {
  var express = require('express');
  const axios = require('axios');

  const NanoClient = require('nano-node-rpc');
  const client = new NanoClient({ url: process.env.NODE_RPC })

  var apicache = require('apicache');
  let cache = apicache.middleware

  var router = express.Router();
  var Account = require('../models/account');

  router.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
  });

  router.use('/statistics', require('./api/statistics'));
  router.use('/representatives', require('./api/accounts'));
  router.use('/accounts', require('./api/accounts'));
  router.use('/blocks', require('./api/blocks'));
  router.use('/confirmation', require('./api/confirmation'));
  router.use('/node', require('./api/node'));
  router.use('/general', require('./api/general'));
  router.use('/github', require('./api/github'));
  router.use('/network', require('./api/network'));
  router.use('/ledger', require('./api/ledger'));
  router.use('/telemetry', require('./api/telemetry'));

  router.get('/', function (req, res, next) {
    res.render('api/index', {
      loggedin: req.isAuthenticated(),
      title: 'API'
    });
  });

  router.get('/blockcount', cache('1 minute'), async (req, res) => {
    try {
      var block_count = await client._send('block_count');
      res.json(block_count);
    } catch (error) {
      console.log(error);
      res.status(500).json({
        "error": "There was an error.",
      });
    }
  });

  router.post('/editAccount', ensureAuthenticated, async (req, res) => {
    try {
      var account = await Account.findOne({
        'account': req.body.account
      })
        .populate('owner')
    } catch (error) {
      res.status(404).end();
      return;
    }

    if (account.owner._id.toString() != req.user._id.toString()) {
      // Forbidden
      res.status(403).end();
      return;
    }

    var output = {};

    account.alias = req.body.account_alias;
    account.description = req.body.account_description;
    account.website = req.body.account_website;

    if (!account.server) {
      account.server = {}
    }

    account.server.type = req.body.server_type;
    account.server.cpu = req.body.server_cpu;
    account.server.ram = req.body.server_ram;
    account.donation = req.body.donation;
    account.closing = req.body.closing;

    if (req.body.account_monitorUrl !== '') {
      try {
        var monitor_url = req.body.account_monitorUrl + '/api.php';
        var monitor_response = await axios.get(monitor_url);
      } catch (error) {
        console.error('MONITOR ERROR', monitor_url, error);
        res.status(400).json({
          status: 'error',
          msg: 'Couldn\'t contact Node Monitor!'
        });
        return;
      }

      if (monitor_response.status !== 200) {
        res.status(400).json({
          status: 'error',
          msg: 'Couldn\'t contact Node Monitor!'
        });
        return;

      } else if (monitor_response.request.protocol != 'https:') {
        output.status = 'error';
        output.msg = 'The monitor is not available via HTTPS!';
        console.log(output);
        return res.status(400).json(output);

      } else if (monitor_response.data.nanoNodeAccount != account.account) {
        output.status = 'error';
        output.msg = 'Node Monitor account mismatch!';
        console.log(output);
        return res.status(400).json(output);

      } else {
        account.monitor.url = req.body.account_monitorUrl;
        account.monitor.version = monitor_response.data.version;
        account.monitor.blocks = monitor_response.data.currentBlock;
      }
    } else {
      console.log('EDIT ACCOUNT - Deleting monitor')
      account.monitor.url = undefined;
      account.monitor.version = undefined;
      account.monitor.blocks = undefined;
    }

    try {
      await account.save();
    } catch (error) {
      res.json({
        status: 'error',
        msg: 'Error!'
      });
    }

    res.json({
      status: 'success',
      msg: 'Success!'
    });
  });

  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      next();
      return;
    }

    req.session.returnTo = req.path;
    res.redirect('/auth/login');
  };

  return router;

}