// database

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/nanonodeninja');


var Account = require('./models/account');

Account.find({
    'slug': {
        $exists: true
    }
}).exec(function (err, accounts) {
    console.log('Accounts' , accounts.length);
    
    for (const account of accounts) {
        delete account.slug;
        console.log(account.account);
        
    }
})