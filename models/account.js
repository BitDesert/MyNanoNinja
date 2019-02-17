// load the things we need
var mongoose = require('mongoose');

// dependencies
var Check = require('./check');

// define the schema for our user model
var accountSchema = mongoose.Schema({

  account: {
    type: String,
    index: true,
    unique: true
  },
  votingweight: {
    type: Number,
    index: true,
    default: 0
  },
  delegators: {
    type: Number,
    default: 0
  },
  lastVoted: Date,
  alias: String,
  verified: {
    type: Boolean,
    default: false
  },
  created: { type: Date, default: Date.now },
  monitor: {
    url: String,
    version: String,
    blocks: Number,
    sync: Number
  },
  description: String,
  website: String,
  server: {
    type: { type: String },
    renewable: Boolean
  },
  uptime: {
    type: Number,
    default: 0
  },
  uptime_data: {
    up: {
      type: Number,
      default: 0
    },
    down: {
      type: Number,
      default: 0
    },
    last: {
      type: Boolean,
      default: true
    },
  },
  network: {
    ip: String,
    port: Number,
    provider: String
  },
  location: {
    country: String,
    city: String,
    latitude: Number,
    longitude: Number
  },
  score: {
    type: Number,
    default: 0
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
    autoIndex: true
  });

accountSchema.methods.updateUptime = function (callback) {
  var self = this;
  Check
    .findOne()
    .where('account', self)
    .sort({ timestamp: -1 })
    .exec(function (err, latestPing) {
      if (err) return callback(err);
      if (!latestPing) return;
      self.lastTested = latestPing.timestamp;
      self.isUp = latestPing.isUp;
      if (latestPing.isUp) {
        // check is up
        // lastChanged is the latest down ping
        self.downtime = 0;
        Check
          .findOne()
          .where('account', self)
          .where('isUp', false)
          .where('timestamp').lt(latestPing.timestamp)
          .sort({ timestamp: -1 })
          .exec(function (err, latestDownPing) {
            if (err) return callback(err);
            if (latestDownPing) {
              self.uptime_data.lastChanged = latestDownPing.timestamp;
              self.uptime_data.uptime = latestPing.timestamp.getTime() - latestDownPing.timestamp.getTime();
              self.save(callback);
            } else {
              // check never went down, last changed is the date of the first ping
              Check
                .findOne()
                .where('account', self)
                .sort({ timestamp: 1 })
                .exec(function (err, firstPing) {
                  if (err) return callback(err);
                  self.uptime_data.lastChanged = firstPing.timestamp;
                  self.uptime_data.uptime = latestPing.timestamp.getTime() - firstPing.timestamp.getTime();
                  self.save(callback);
                });
            }
          });
      } else {
        // check is down
        // lastChanged is the latest up ping
        self.uptime_data.uptime = 0;
        Check
          .findOne()
          .where('account', self)
          .where('isUp', true)
          .where('timestamp').lt(latestPing.timestamp)
          .sort({ timestamp: -1 })
          .exec(function (err, latestUpPing) {
            if (err) return callback(err);
            if (latestUpPing) {
              self.uptime_data.lastChanged = latestUpPing.timestamp;
              self.uptime_data.downtime = latestPing.timestamp.getTime() - latestUpPing.timestamp.getTime();
              self.save(callback);
            } else {
              // check never went up, last changed is the date of the first ping
              Check
                .findOne()
                .where('account', self)
                .sort({ timestamp: 1 })
                .exec(function (err, firstPing) {
                  if (err) return callback(err);
                  self.uptime_data.lastChanged = firstPing.timestamp;
                  self.uptime_data.downtime = latestPing.timestamp.getTime() - firstPing.timestamp.getTime();
                  self.save(callback);
                });
            }
          });
      }
    });
};

accountSchema.methods.getStatsForPeriod = function (begin, end, callback) {
  var self = this;
  Check.aggregate(
    {
      $match: {
        account: self._id,
        timestamp: { $gte: begin, $lte: end }
      }
    },
    {
      $project: {
        address: 1,
        uptime: { $cond: [{ $and: ["$isUp"] }, 100, 0] },
        time: 1,
      }
    },
    {
      $group: {
        _id: "$address",
        count: { $sum: 1 },
        uptime: { $avg: "$uptime" },
        begin: { $first: begin.valueOf() }, // dunno any other way to set a constant
        end: { $first: end.valueOf() }
      }
    },
    callback
  );
};

// create the model for users and expose it to our app
var Account = mongoose.model('Account', accountSchema);

Account.createIndexes(function (err) {
  if (err) console.log('Account Model', err);
});

module.exports = Account;