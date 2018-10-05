module.exports = function (nanorpc) {
  var express = require('express');
  var request = require('request');

  var router = express.Router();
  var Account = require('../models/account');

  router.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  var statisticsRouter = require('./api/statistics');
  var accountsRouter = require('./api/accounts');

  router.use('/statistics', statisticsRouter);
  router.use('/representatives', accountsRouter);
  router.use('/accounts', accountsRouter);

  router.get('/', function (req, res, next) {
    res.render('api', {
      loggedin: req.isAuthenticated(),
      title: 'API'
    });
  });

  router.get('/blockcount', function (req, res) {
    res.json({
      count: nanorpc.getBlockcount()
    });
  });

  router.get('/ledger/download', function (req, res) {
    request.get({
      url: 'https://cloud-api.yandex.net/v1/disk/public/resources?public_key=https://yadi.sk/d/fcZgyES73Jzj5T&sort=-created&limit=1',
      json: true
    }, function (err, response, data) {
      if (err || response.statusCode !== 200) {
        res.status(404).end();
      } else {
        res.redirect(data._embedded.items[0].file);
      }
    });
  });

  router.post('/editAccount', ensureAuthenticated, function (req, res) {
    Account.findOne({
        'account': req.body.account
      })
      .populate('owner')
      .exec(function (err, account) {
        if (err || !account) {
          // Not found
          res.status(404).end();
          return;
        }

        if (account.owner._id.toString() != req.user._id.toString()) {
          // Forbidden
          res.status(403).end();
          return;
        }

        var output = {};

        console.log(account);

        account.alias = req.body.account_alias;
        account.location = req.body.account_location;
        account.description = req.body.account_description;
        account.website = req.body.account_website;

        if(!account.server){
          account.server = {}
        }

        account.server.type = req.body.server_type;
        account.server.renewable = req.body.server_renewable;

        if (req.body.account_monitorUrl) {
          request.get({
            url: req.body.account_monitorUrl + '/api.php',
            json: true
          }, function (err, response, data) {
            if (err || response.statusCode !== 200) {
              output.status = 'error';
              output.msg = 'Couldn\'t contact Node Monitor!';
              res.json(output);

            } else if (data.nanoNodeAccount != account.account) {
              output.status = 'error';
              output.msg = 'Node Monitor account mismatch!';
              res.json(output);

            } else {
              account.monitor.url = req.body.account_monitorUrl;
              account.monitor.version = data.version;
              account.monitor.blocks = data.currentBlock;
              account.monitor.sync = round((data.currentBlock / nanorpc.getBlockcount())*100, 3);
              if(account.monitor.sync > 100){
                account.monitor.sync = 100;
              }

              account.save(function (err) {
                if (err) {
                  output.status = 'error';
                  output.msg = 'Error!';
                } else {
                  output.status = 'success';
                  output.msg = 'Success!';
                }
                res.json(output);
              });
            }
          });
        } else {

          account.save(function (err) {
            if (err) {
              output.status = 'error';
              output.msg = 'Error!';
            } else {
              output.status = 'success';
              output.msg = 'Success!';
            }
            res.json(output);
          });
        }
      });
  });

  router.post('/setuppod', function (req, res) {
    var output = {};

    if(req.body.key !== process.env.BRAINBLOCKS_POD_KEY){
      output.status = 'error';
      output.msg = 'Wrong key';
      res.json(output);
      return;
    }

    if(!req.body.account){
      output.status = 'error';
      output.msg = 'Account missing';
      res.json(output);
      return;
    }

    var myaccount = req.body.account;

    Account.findOne({
      'account': myaccount
    }, function (err, account) {
      if (err){
        return
      }

      if (!account){
        var account = new Account();
        account.account = myaccount;
        account.votingweight = 0;
      }

      // set the type
      account.server.type = 'BrainBlocks Pod';

      account.save(function (err) {
        if (err) {
          console.log("API - setuppod - Error saving account", err);
          output.status = 'error';
          output.msg = 'Cannot update';
        } else {
          output.status = 'success';
          output.msg = 'Successfully updated';
        }
        res.json(output);
      });
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

  function round(value, precision) {
    if (Number.isInteger(precision)) {
      var shift = Math.pow(10, precision);
      return Math.round(value * shift) / shift;
    } else {
      return Math.round(value);
    }
  }

  return router;

}