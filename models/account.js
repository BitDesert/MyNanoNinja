// load the things we need
var mongoose = require('mongoose');

// dependencies
var slug = require('mongoose-slug-updater');
var Check = require('./check');

// load slug
mongoose.plugin(slug)

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
  votelatency: Number,
  alias: String,
  slug: { type: String, slug: "alias", unique: true, sparse: true },
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
  uptime_over: {
    day: { type: Number, default: 0 },
    week: { type: Number, default: 0 },
    month: { type: Number, default: 0 },
    "3_months": { type: Number, default: 0 },
    "6_months": { type: Number, default: 0 },
    year: { type: Number, default: 0 }
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

  var end = new Date(Date.now());

  var begin = new Date(Date.now() - 24 * 60 * 60 * 1000);

  self.getStatsForPeriod(begin, end, function (err, stats) {
    if (err) return
    console.log('DAY', stats[0].uptime);

    self.uptime_over.day = stats[0].uptime;
    self.markModified('uptime_over.day')
    self.save()
  })

  var begin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  self.getStatsForPeriod(begin, end, function (err, stats) {
    if (err) return
    console.log('WEEK', stats[0].uptime);
    self.uptime_over.week = stats[0].uptime;
    self.markModified('uptime_over.week')
    self.save()
  })

  var begin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  self.getStatsForPeriod(begin, end, function (err, stats) {
    if (err) return
    console.log('MONTH', stats[0].uptime);
    self.uptime_over.month = stats[0].uptime;
    self.markModified('uptime_over.month')
    self.save()
  })

  var begin = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  self.getStatsForPeriod(begin, end, function (err, stats) {
    if (err) return
    console.log('YEAR', stats[0].uptime);
    self.uptime_over.year = stats[0].uptime;
    self.markModified('uptime_over.year')
    self.save()
  })

  callback();
};

accountSchema.methods.updateUptimeFor = function (type, callback) {
  var self = this;

  switch (type) {
    case 'day':
      var begin = new Date(Date.now() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      var begin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      var begin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '3_months':
      var begin = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      break;
    case '6_months':
      var begin = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      var begin = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      return
      break;
  }

  var end = new Date(Date.now());

  self.getStatsForPeriod(begin, end, function (err, stats) {
    if (err){
      console.error(err);
      callback()
      return
    } 

    if (!stats || stats.length == 0){
      console.error(self.account, 'No Uptime', stats);
      
      if(typeof callback === "function")
        callback()
      
      return
    } 
    //console.log(type, stats);

    self.uptime_over[type] = stats[0].uptime;
    self.markModified('uptime_over.'+type)
    self.save(callback)
  })
};

accountSchema.methods.getStatsForPeriod = function (begin, end, callback) {
  var self = this;
  Check.aggregate([
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
    }],
    callback
  );
};

// create the model for users and expose it to our app
var Account = mongoose.model('Account', accountSchema);

Account.createIndexes(function (err) {
  if (err) console.log('Account Model', err);
});

module.exports = Account;