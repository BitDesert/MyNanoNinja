const WebSocket = require('ws');
var async = require("async");
var Account = require('../models/account');

var ws;

function connectWS() {
  ws = new WebSocket(process.env.NODE_WS);
  ws.on('open', function () {
    console.log('VOTELATENCY: socket open');
    wsStartup()
  });
  ws.on('error', function () {
    console.log('VOTELATENCY: socket error');
  });
  ws.on('close', function () {
    console.log('VOTELATENCY: socket close');
    setTimeout(connectWS, 10 * 1000);
  });
};
connectWS();

function wsSend(json) {
  ws.send(JSON.stringify(json));
}

function wsStartup() {
  wsSend({
    "action": "subscribe",
    "topic": "confirmation",
    "options": {
      "confirmation_type": "active_quorum"
    }
  });
  wsSend({
    "action": "subscribe",
    "topic": "vote"
  });

  ws.on('message', function incoming(data) {
    var data = JSON.parse(data);

    if (data.topic == 'confirmation') {
      blockConfirmed(data.message.hash, data.time)
    } else if (data.topic == 'vote') {
      data.message.blocks.forEach(hash => {
        blockVote(hash, data.message.account, data.time)
      });
    }
  });
}

// start analyze script
var blocks = []

function blockVote(hash, account, time) {

  var findBlock = blocks.findIndex(e => e.hash === hash)

  if (findBlock >= 0) {
    //console.log('Another vote for', block);

    var findAccount = blocks[findBlock].votes.findIndex(vote => vote.account === account);

    if (findAccount === -1) {
      blocks[findBlock].votes.push({
        account: account,
        time: time
      });
    } else {
      //console.log('Already voted', hash, account);
    }

  } else {
    //console.log('First vote for', hash);

    blocks.push({
      hash: hash,
      confirmed: false,
      confirmation_time: 0,
      votes: [{
        account: account,
        time: time
      }]
    })
  }
}

function blockConfirmed(hash, time) {
  var findBlock = blocks.findIndex(e => e.hash === hash)

  if (findBlock >= 0) {
    blocks[findBlock].confirmed = true
    blocks[findBlock].confirmation_time = time
  } else {
    console.log('VOTELATENCY: No votes for', hash);
  }
}

function updateLatency(account, latency, callback) {
  Account.findOne(
    {
      'account': account
    }, function (err, account) {
      if (err) {
        callback();
        return;
      }

      if (!account) {
        var account = new Account();
        account.account = account;
      }

      account.votelatency = latency;
      account.save(function (err) {
        if (err) {
          console.log("updateLatency - Error saving account", err);
        }
        callback();
      });

    });
}

function analyzeBlocks() {
  var confirmedblocks = blocks.filter(block => block.confirmed === true)

  if (confirmedblocks.length == 0) {
    console.log('VOTELATENCY: No blocks confirmed');
    return
  }

  var reps = []

  confirmedblocks.forEach(block => {
    console.log('VOTELATENCY:', block.hash, block.votes.length);

    block.votes.forEach(vote => {

      var timing = vote.time - block.confirmation_time;
      var findRep = reps.findIndex(rep => rep.account == vote.account);

      if (findRep >= 0) {
        reps[findRep].timings.push(timing)
      } else {
        reps.push({
          account: vote.account,
          timings: [timing],
          timing_avg: 0
        })
      }
    });
  });

  async.forEachOfSeries(reps, (rep, key, callback) => {

    var timing_avg = Math.round(rep.timings.reduce((p, c) => p + c, 0) / rep.timings.length);
    updateLatency(rep.account, timing_avg, callback);

  }, err => {
    if (err) {
      console.error('VOTELATENCY:', err.message);
      return
    }
    console.log('VOTELATENCY: Done');
  });

  // clear the blocks
  //blocks = blocks.filter(block => block.confirmed !== true)
  blocks = []
}

setInterval(analyzeBlocks, 5 * 60 * 1000)