console.log('=== STARING NANO NINJA CRON ===');

// global requirements
var Raven = require('raven');
Raven.config(process.env.SENTRY_URL).install();

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL,
  { useNewUrlParser: true }
);

const { fork } = require('child_process');

// cron subtasks
fork('./cron/peers');
fork('./cron/statistics');
fork('./cron/votes');
fork('./cron/uptime');
fork('./cron/uptimenotification');
fork('./cron/monitors');
fork('./cron/scores');
fork('./cron/representatives');
//fork('./cron/weights');
fork('./cron/delegators');
fork('./cron/votelatency');