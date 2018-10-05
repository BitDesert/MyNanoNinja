// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var statisticsSchema = mongoose.Schema({

    date: { type: Date, default: Date.now },
    representatives: {
        total: Number,
        eligible: Number,
        online: Number
    }

}, { autoIndex: true });

// create the model for users and expose it to our app
var Statistics = mongoose.model('Statistics', statisticsSchema);

Statistics.ensureIndexes(function (err) {
    if (err) console.log('Statistics Model', err);
});

module.exports = Statistics;