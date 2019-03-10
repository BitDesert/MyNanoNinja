// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var statisticsQuorumSchema = mongoose.Schema({

    date: {
        type: Date,
        default: Date.now
    },
    quorum_delta: Number,
    online_stake_total: Number,
    peers_stake_total: Number

}, {
    autoIndex: true
});

// create the model for users and expose it to our app
var StatisticsQuorum = mongoose.model('StatisticsQuorum', statisticsQuorumSchema);

StatisticsQuorum.createIndexes(function (err) {
    if (err) console.log('StatisticsQuorum Model', err);
});

module.exports = StatisticsQuorum;