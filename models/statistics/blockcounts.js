// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var statisticsBlockcountsSchema = mongoose.Schema({

    date: {
        type: Date,
        default: Date.now
    },
    blockcounts: [{
        account: String,
        count: Number
    }]

}, {
    autoIndex: true
});

// create the model for users and expose it to our app
var StatisticsBlockcounts = mongoose.model('StatisticsBlockcounts', statisticsBlockcountsSchema);

StatisticsBlockcounts.createIndexes(function (err) {
    if (err) console.log('StatisticsBlockcounts Model', err);
});

module.exports = StatisticsBlockcounts;