var express = require('express');
var request = require('request');
const axios = require('axios');
const RateLimiterMemory = require('rate-limiter-flexible').RateLimiterMemory;
var User = require('../../models/user');

const NanoClient = require('nano-node-rpc');
const client = new NanoClient({url: process.env.NODE_RPC})

var router = express.Router();

const opts = {
  points: 240,
  duration: 60 * 60, // in seconds
};

const rateLimiter = new RateLimiterMemory(opts);

const allowed_actions = [
  'account_balance',
  'account_info',
  'account_history',
  'account_key',
  'account_representative',
  'account_weight',
  'accounts_balances',
  'accounts_frontiers',
  'accounts_pending',
  'active_difficulty',
  'available_supply',
  'block_info',
  'block_account',
  'block_create',
  'block_confirm',
  'block_count',
  'block_count_type',
  'blocks_info',
  'chain',
  'confirmation_active',
  'confirmation_history',
  'confirmation_info',
  'confirmation_quorum',
  'frontier_count',
  'process',
  'representatives',
  'representatives_online',
  'successors',
  'version',
  'peers',
  'pending',
  'pending_exists',
  'work_validate',
  'work_generate',
  'key_create',
  'krai_from_raw',
  'krai_to_raw',
  'mrai_from_raw',
  'mrai_to_raw',
  'rai_from_raw',
  'rai_to_raw',
  'validate_account_number'
]

isApiAuthorized = (req, res, next) => {
  const authHeader = req.headers.authorization

  const consumePoints = req.body.action === 'work_generate' ? 10 : 1;  

  if (!authHeader) {
    console.log('NODE API - No header')

    rateLimiter.consume(req.ip, consumePoints)
      .then((rateLimiterRes) => {
        res.set('X-RateLimit-Remaining', rateLimiterRes.remainingPoints)
        res.set("X-RateLimit-Reset", new Date(Date.now() + rateLimiterRes.msBeforeNext))
        next();
      })
      .catch((rateLimiterRes) => {
        res.set('X-RateLimit-Remaining', rateLimiterRes.remainingPoints)
        res.set("X-RateLimit-Reset", new Date(Date.now() + rateLimiterRes.msBeforeNext))
        return res.status(429).json({ message: 'Too Many Requests'});
      });

  } else {
    User.findOne({
        'api.key': authHeader
      })
      .where('api.calls_remaining').gte(consumePoints)
      .select('api')
      .exec(function (err, user) {
        if (err || !user) {
          console.log('NODE API - Insufficient funds / User not found')
          return res.status(403).json({
            message: 'Insufficient funds / User not found'
          })
        }
        user.api.calls_remaining = user.api.calls_remaining - consumePoints;
        res.set('X-API-Tokens', user.api.calls_remaining)
        user.save();
        next();
      });
  }
}


// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated())
    return next();

  res.redirect('/');
}

router.get('/', function (req, res, next) {
  res.render('api/node', {
    loggedin: req.isAuthenticated(),
    title: 'Nano Node API',
    user: req.user,
  });
});

router.post('/', isApiAuthorized, function (req, res) {

  const action = req.body.action;

  if (!action) {
    console.log('NODE API - No action')
    return res.status(400).json({
      message: 'No action provided'
    })
  } else if (!allowed_actions.includes(action)) {
    console.log('NODE API - Action not supported')
    return res.status(400).json({
      message: 'Action is not supported'
    })
  }

  var params = Object.assign({}, req.body);
  delete params.action;

  if (action == 'work_generate') {
    console.log('work_generate via DPOW');

    axios.post('https://dpow.nanocenter.org/service/', {
        "hash": params.hash,
        "user": process.env.DPOW_USER,
        "api_key": process.env.DPOW_KEY
      })
      .then(function (response) {
        console.log('work_generate success', response.data.work);

        res.json({
          work: response.data.work
        });
      })
      .catch(function (error) {
        console.log('work_generate error', error);
        res.status(500).json({
          error: 'Not found',
          msg: error
        });
      });

  } else {
    client._send(action, params)
      .then(response => {
        if (!response) return res.status(404).json({
          error: 'Not found'
        });

        res.json(response);
      })
      .catch(reason => {
        res.status(500).json({
          error: 'Not found',
          msg: reason
        });
      });
  }
});

router.get('/version', function (req, res) {
  client._send('version')
    .then(response => {
      if (!response) return res.status(404).json({
        error: 'Not found'
      });

      res.json(response);
    })
    .catch(reason => {
      res.status(500).json({
        error: 'Not found',
        msg: reason
      });
    });
});

router.get('/payment/:token/verify', isLoggedIn, function (req, res) {
  var user = req.user;
  var token = req.params.token;

  var output = {};

  request.get({
    url: 'https://mynano.ninja/payment/api/verify?token=' + token,
    json: true
  }, function (err, response, data) {
    if (err || response.statusCode !== 200) {
      output.error = 'API error';
      res.send(output);

    } else if (data.fulfilled === false) {
      output.error = 'not_fulfilled';
      res.send(output);

    } else {
      var paidcalls = Math.floor(data.amount * 100);
      user.api.calls_remaining = user.api.calls_remaining + paidcalls;

      user.save(function (err) {
        if (err) {
          console.log("API - Node more calls", err);
        }
        output.status = 'OK';
        output.paidcalls = paidcalls;
        res.send(output);
      });
    }
  });
});

module.exports = router;