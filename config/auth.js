// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

  twitterAuth: {
  consumerKey: process.env.TWITTER_CONSUMERKEY,
  consumerSecret: process.env.TWITTER_CONSUMERSECRET,
  callbackURL: process.env.DOMAIN + '/auth/twitter/callback',
  passReqToCallback: true
  },

  githubAuth: {
    clientID: process.env.GITHUB_CLIENTID,
    clientSecret: process.env.GITHUB_CLIENTSECRET,
    callbackURL: process.env.DOMAIN + '/auth/github/callback',
    passReqToCallback: true
  },

  redditAuth: {
    clientID: process.env.REDDIT_CLIENTID,
    clientSecret: process.env.REDDIT_CLIENTSECRET,
    callbackURL: process.env.DOMAIN + '/auth/reddit/callback',
    passReqToCallback: true
  },

  discordAuth: {
    clientID: process.env.DISCORD_CLIENTID,
    clientSecret: process.env.DISCORD_CLIENTSECRET,
    callbackURL: process.env.DOMAIN + '/auth/discord/callback',
    scope: 'identify email',
    passReqToCallback: true
  }

};
