var express = require('express');
const {
  Nano
} = require('nanode');

var User = require('../../models/user');

const nano = new Nano({
  url: process.env.NODE_RPC
});
var router = express.Router();

const allowed_actions = [
  'account_balance',
  'account_info',
  'account_history',
  'account_key',
  'account_representative',
  'account_weight',
  'available_supply',
  'block_info',
  'block_account',
  'block_count',
  'block_count_type',
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
  'work_validate'
]

isApiAuthorized = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    console.log('NODE API - No header')
    return res.status(403).json({
      message: 'FORBIDDEN'
    })
  } else {
    User.findOne({
      'api.key': authHeader
    })
    .where('api.calls_remaining').gt(0)
    .select('api')
    .exec(function (err, user) {
      if (err || !user) {
        console.log('NODE API - Insufficient funds / User not found')
        return res.status(403).json({
          message: 'FORBIDDEN'
        })
      }
      user.api.calls_remaining--;
      res.set('X-API-Calls', user.api.calls_remaining)
      user.save();
      next();
    });
  }
}

router.post('/', isApiAuthorized, function (req, res) {

  const action = req.body.action;

  if(!action){
    console.log('NODE API - No action')
    return res.status(400).json({
      message: 'No action provided'
    })
  } else if(!allowed_actions.includes(action)){
    console.log('NODE API - Action not supported')
    return res.status(400).json({
      message: 'Action is not supported'
    })
  }

  var params = Object.assign({}, req.body);
  delete params.action;

  nano.rpc(action, params)
  .then(response => {
    if(!response) return res.status(404).json({ error: 'Not found' });

    res.json(response);
  })
  .catch(reason => {
    res.status(500).json({ error: 'Not found', msg: reason });
  });
});

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