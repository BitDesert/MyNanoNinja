// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var checkSchema = mongoose.Schema({
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  account: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account' 
  },
  isUp: Boolean,
}, {
    autoIndex: true
  }
);

checkSchema.index({ timestamp: -1 });
checkSchema.index({ account: 1 });

// create the model for users and expose it to our app
var Check = mongoose.model('Check', checkSchema);

Check.createIndexes(function (err) {
  if (err) console.log('Check Model', err);
});

module.exports = Check;