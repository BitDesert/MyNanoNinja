// load the things we need
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var randtoken = require('rand-token');

// define the schema for our user model
var userSchema = mongoose.Schema({
  api: {
    key: {
      type: String,
      default: function () {
        return randtoken.generate(64);
      },
      unique: true,
      sparse: true
    },
    calls_remaining: {
      type: Number,
      default: 100
    }
  },
  twitter: {
    id: String,
    token: String,
    displayName: String,
    username: String,
    avatar: String
  },
  github: {
    id: String,
    token: String,
    username: String,
    displayName: String,
    avatar: String
  },
  reddit: {
    id: String,
    token: String,
    name: String,
    avatar: String
  },
  discord: {
    id: String,
    token: String,
    username: String,
    discriminator: String,
    avatar: String,
    email: String
  }

});

userSchema.methods.getEmails = function () {
  var emails = [];
  var user = this.toObject();

  Object.keys(user).forEach(function (key) {
    if (typeof user[key].token !== 'undefined' && user[key].email) {
      emails.push(user[key].email);
    }
  });

  // remove duplicates
  emails = emails.filter(function (item, pos) {
    return emails.indexOf(item) == pos;
  });

  return emails;
};

// create the model for users and expose it to our app
var User = mongoose.model('User', userSchema);

User.createIndexes(function (err) {
  if (err) console.log('User Model', err);
});

module.exports = User;