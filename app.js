console.log('=== STARING NANO NINJA ===');

var Raven = require('raven');
Raven.config(process.env.SENTRY_URL).install();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var bodyParser = require('body-parser');
var session = require('express-session');
const MongoStore = require('connect-mongo')(session);

// database
var configDB = require('./config/database.js');
mongoose.connect(configDB.url, { useMongoClient: true });

// nano node
if(process.env.NODE_INTERNAL != ''){
   var nanonode = require('./nano/node');
}

var nanorpc = require('./nano/rpc_client');
var cron = require('./cron')(nanorpc);

// passport
require('./config/passport')(passport); // pass passport for configuration

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json()); // get information from html forms
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/static/js', express.static(__dirname + '/node_modules/chart.js/dist/'));
app.use('/static/js', express.static(__dirname + '/node_modules/moment/min/'));
app.use('/static/js', express.static(__dirname + '/node_modules/clipboard/dist/'));
app.use('/static/js', express.static(__dirname + '/node_modules/popper.js/dist/umd/'));
app.use('/static/js', express.static(__dirname + '/node_modules/big.js/'));
app.use('/static/js/accept-nano', express.static(__dirname + '/node_modules/@accept-nano/client/dist/'));

// required for passport
app.use(session({
  secret: process.env.SESSION_SECRET, // session secret
  resave: true,
  saveUninitialized: true,
  store: new MongoStore({url: configDB.sessionurl})
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// routes
var indexRouter = require('./routes/index')(nanorpc);
var apiRouter = require('./routes/api')(nanorpc);
var accountRouter = require('./routes/account')(nanorpc);
var profileRouter = require('./routes/profile');
var authRouter = require('./routes/auth')(passport, nanorpc);
var statisticsRouter = require('./routes/statistics');

app.use('/', indexRouter);
app.use('/api', apiRouter);
app.use('/account', accountRouter);
app.use('/profile', profileRouter);
app.use('/auth', authRouter);
app.use('/statistics', statisticsRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error', {
    loggedin: req.isAuthenticated()
  });
});

module.exports = app;
