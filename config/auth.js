// config/auth.js

// expose our config directly to our application using module.exports
module.exports = {

    facebookAuth: {
        clientID: process.env.FACEBOOK_CLIENTID,
        clientSecret: process.env.FACEBOOK_CLIENTSECRET,
        callbackURL: process.env.DOMAIN + '/auth/facebook/callback',
        profileURL: 'https://graph.facebook.com/v2.5/me?fields=first_name,last_name,email',
        profileFields: ['id', 'email', 'name'],
		passReqToCallback: true
    },

    twitterAuth: {
        consumerKey: process.env.TWITTER_CONSUMERKEY,
        consumerSecret: process.env.TWITTER_CONSUMERSECRET,
		callbackURL: process.env.DOMAIN + '/auth/twitter/callback',
		passReqToCallback: true
    },

	googleAuth: {
		clientID: process.env.GOOGLE_CLIENTID,
		clientSecret: process.env.GOOGLE_CLIENTSECCRET,
		callbackURL: process.env.DOMAIN + '/auth/google/callback',
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
