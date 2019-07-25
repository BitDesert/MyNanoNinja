var async = require("async");
var cron = require('node-cron');
const nodemailer = require('nodemailer');
var moment = require('moment');
const {
  Nano
} = require('nanode');

var Account = require('../models/account');
var Check = require('../models/check');

const nano = new Nano({
  url: process.env.NODE_RPC
});

// mail
let transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true, // upgrade later with STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

cron.schedule('*/30 * * * *', updateNodeUptime);

function updateNodeUptime() {
  console.log('UPTIME: Started');
  Account.find()
    .where('votingweight').gte(1000000000000000000000000000000)
    .populate('owner')
    .exec(function (err, accounts) {
      if (err) {
        console.error('UPTIME:', err);
        return
      }
      console.log('UPTIME: ' + accounts.length + " accounts");

      async.forEachOfSeries(accounts, (account, key, callback) => {

        checkNodeUptime(account, callback);

      }, err => {
        if (err) {
          console.error(err.message);
          return
        }
        console.log('UPTIME: Done');
      });
    });
}

function checkNodeUptime(account, callback) {
  var previous = account.uptime_data.last;
  if (account.lastVoted && moment(account.lastVoted).isAfter(moment().subtract(30, 'minutes').toDate())) {
    account.uptime_data.up++;
    account.uptime_data.last = true;
  } else {
    account.uptime_data.down++;
    account.uptime_data.last = false;
  }
  account.uptime = ((account.uptime_data.up / (account.uptime_data.up + account.uptime_data.down)) * 100);

  var check = new Check();
  check.account = account._id;
  check.isUp = account.uptime_data.last;
  check.save();

  if (account.alias) {
    var title = account.alias;
  } else {
    var title = account.account;
  }

  if (account.owner && process.env.NODE_ENV != 'development') {
    if (previous === true && account.uptime_data.last === false) {
      console.log('UPTIME: ' + account.account + ' went down!');

      account.owner.getEmails().forEach(function (email) {
        sendDownMail(account, email);
      });

    } else if (previous === false && account.uptime_data.last === true) {
      console.log('UPTIME: ' + account.account + ' went up!');

      account.owner.getEmails().forEach(function (email) {
        sendUpMail(account, email);
      });
    }
  }

  account.save(function (err) {
    if (err) {
      console.log("UPTIME: Error saving account", err);
    }
    account.updateUptimeFor('day')
    callback();
  });
}

function sendUpMail(account, email) {

  if (account.alias) {
    var title = account.alias;
  } else {
    var title = account.account;
  }

  if (account.lastVoted) {
    var lastvote = 'Last voted ' + moment(account.lastVoted).fromNow();
  } else {
    var lastvote = 'Never noted';
  }

  var body = 'The Nano representative ' + title + ' is up again.<br>' +
    lastvote + '.<br>' +
    'Address: ' + account.account + '<br><br>' +
    '<a href="https://mynano.ninja/account/' + account.account + '">View on My Nano Ninja</a>'

  sendMail('UP: ' + title, body, email);
}

function sendDownMail(account, email) {

  if (account.alias) {
    var title = account.alias;
  } else {
    var title = account.account;
  }

  if (account.lastVoted) {
    var lastvote = 'Last voted ' + moment(account.lastVoted).fromNow();
  } else {
    var lastvote = 'Never noted';
  }

  var body = 'The Nano representative ' + title + ' is down.<br>' +
    lastvote + '.<br>' +
    'Address: ' + account.account + '<br><br>' +
    '<a href="https://mynano.ninja/account/' + account.account + '">View on My Nano Ninja</a>'

  sendMail('DOWN: ' + title, body, email);
}

function sendMail(subject, body, email) {
  var data = {
    from: 'My Nano Ninja <alert@mynano.ninja>',
    to: email,
    subject: subject,
    html: body
  }
  transporter.sendMail(data);
}