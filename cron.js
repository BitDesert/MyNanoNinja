console.log('=== STARING NANO NINJA CRON ===');

require('dotenv').config()

// global requirements
var Raven = require('raven');
Raven.config(process.env.SENTRY_URL).install();

var mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL,
  { useNewUrlParser: true }
);

// cron subtasks
require('./cron/peers');
require('./cron/statistics');
require('./cron/votes');
require('./cron/uptime');
require('./cron/uptimecheck');
//require('./cron/uptimenotification');
//require('./cron/monitors');
require('./cron/scores');
require('./cron/representatives');
require('./cron/weights');
require('./cron/delegators');
require('./cron/votelatency');
require('./cron/telemetry');