// load the things we need
var mongoose = require('mongoose');

// define the schema for our user model
var statisticsVersionsSchema = mongoose.Schema({

    date: { type: Date, default: Date.now },
    nodeversions: {
        1: { type: Number, default: 0 },
        2: { type: Number, default: 0 },
        3: { type: Number, default: 0 },
        4: { type: Number, default: 0 },
        5: { type: Number, default: 0 },
        6: { type: Number, default: 0 },
        7: { type: Number, default: 0 },
        8: { type: Number, default: 0 },
        9: { type: Number, default: 0 },
        10: { type: Number, default: 0 },
        11: { type: Number, default: 0 },
        12: { type: Number, default: 0 },
        13: { type: Number, default: 0 },
        14: { type: Number, default: 0 },
        15: { type: Number, default: 0 },
        16: { type: Number, default: 0 },
        17: { type: Number, default: 0 },
        18: { type: Number, default: 0 },
        19: { type: Number, default: 0 },
        20: { type: Number, default: 0 }
    }

}, { autoIndex: true });

// create the model for users and expose it to our app
var StatisticsVersions = mongoose.model('StatisticsVersions', statisticsVersionsSchema);

StatisticsVersions.ensureIndexes(function (err) {
    if (err) console.log('StatisticsVersions Model', err);
});

module.exports = StatisticsVersions;