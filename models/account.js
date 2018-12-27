// load the things we need
var mongoose = require('mongoose');

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
  created: { type: Date, default: Date.now },
  monitor: {
    url: String,
    version: String,
    blocks: Number,
    sync: Number
  },
  location: String,
  description: String,
  website: String,
  server: {
    type: {type: String},
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
    }
  },
  network: {
    ip: String,
    port: Number
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

// create the model for users and expose it to our app
var Account = mongoose.model('Account', accountSchema);

Account.createIndexes(function (err) {
  if (err) console.log('Account Model', err);
});

module.exports = Account;