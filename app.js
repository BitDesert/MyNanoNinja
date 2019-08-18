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

// analytics
const matomo = require('./utils/matomo');
var ua = require("universal-analytics");

// database
var configDB = require('./config/database.js');
mongoose.connect(configDB.url,
  { useNewUrlParser: true }
);

var nanorpc = require('./nano/rpc_client');

// passport
require('./config/passport')(passport); // pass passport for configuration

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.enable('trust proxy')

if (process.env.MATOMO_URL) {
  console.log('Matomo Analytics activated');

  app.use(matomo({
    siteId: process.env.MATOMO_SITE,
    matomoUrl: process.env.MATOMO_URL,
    matomoToken: process.env.MATOMO_TOKEN
  }));
}

app.use(ua.middleware("UA-115902726-4", { cookieName: '_ga' }));
app.use(function (req, res, next) {
  if (!req.headers['x-forwarded-for']) {
      req.headers['x-forwarded-for'] = '0.0.0.0';
  }
  req.visitor.pageview({
    dp: req.originalUrl,
    dr: req.get('Referer'),
    ua: req.headers['user-agent'],
    uip: req.connection.remoteAddress
      || req.socket.remoteAddress
      || req.connection.remoteAddress
      || req.headers['x-forwarded-for'].split(',').pop()
  }).send()
  next();
});

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
app.use('/static/js', express.static(__dirname + '/node_modules/vue/dist/'));
app.use('/static/js', express.static(__dirname + '/node_modules/axios/dist/'));
//app.use('/static/js/accept-nano', express.static(__dirname + '/node_modules/@accept-nano/client/dist/'));

// required for passport
app.use(session({
  secret: process.env.SESSION_SECRET, // session secret
  resave: true,
  saveUninitialized: true,
  store: new MongoStore({ url: configDB.sessionurl })
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

// routes
var indexRouter = require('./routes/index')(nanorpc);
var v1Router = require('./routes/v1');
var apiRouter = require('./routes/api')(nanorpc);
var accountRouter = require('./routes/account')(nanorpc);
var blockRouter = require('./routes/block');
var profileRouter = require('./routes/profile');
var authRouter = require('./routes/auth')(passport, nanorpc);
var statisticsRouter = require('./routes/statistics');

app.use('/', indexRouter);
app.use('/v1', v1Router);
app.use('/api', apiRouter);
app.use('/account', accountRouter);
app.use('/block', blockRouter);
app.use('/profile', profileRouter);
app.use('/auth', authRouter);
app.use('/statistics', statisticsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
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
