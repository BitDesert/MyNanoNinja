module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application
    {
      name      : 'My Nano Ninja',
      script    : 'bin/www',
      "log_date_format" : "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: 'production',
        DOMAIN: 'https://mynano.ninja',
        NODE_RPC: 'http://[::1]:7076',
        NODE_INTERNAL: '12000',
        MONGO_URL: 'mongodb://localhost:27017/mynanoninja',
        MONGO_SESSIONURL: 'mongodb://localhost:27017/mynanoninja-session',
        SESSION_SECRET: 'ohyeahnanoisgreat',
        SENTRY_URL: '',
        FACEBOOK_CLIENTID: '',
        FACEBOOK_CLIENTSECRET: '',
        TWITTER_CONSUMERKEY: '',
        TWITTER_CONSUMERSECRET: '',
        GOOGLE_CLIENTID: '',
        GOOGLE_CLIENTSECRET: '',
        GITHUB_CLIENTID: '',
        GITHUB_CLIENTSECRET: '',
        REDDIT_CLIENTID: '',
        REDDIT_CLIENTSECRET: '',
        DISCORD_CLIENTID: '',
        DISCORD_CLIENTSECRET: '',
        EMAIL_HOST: 'smtp.myhost.com',
        EMAIL_USER: 'alert@mynano.ninja',
        EMAIL_PASS: 'mypassword',
        BRAINBLOCKS_POD_KEY: 'mykey',
        DPOW_USER: 'user',
        DPOW_KEY: 'longhash',
        DRPC_REPSONLINE: '[]',
        VERIFICATION_AMOUNT: '1',
        MATOMO_URL: "https://piwik.org/piwik.php",
        MATOMO_TOKEN: "yourtoken",
        MATOMO_SITE: "1",
        PORT: 4000
      }
    },
    {
      name      : 'My Nano Ninja',
      script    : 'bin/www',
      "log_date_format" : "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: 'production',
        DOMAIN: 'https://mynano.ninja',
        NODE_RPC: 'http://[::1]:7076',
        MONGO_URL: 'mongodb://localhost:27017/mynanoninja',
        SENTRY_URL: '',
        EMAIL_HOST: 'smtp.myhost.com',
        EMAIL_USER: 'alert@mynano.ninja',
        EMAIL_PASS: 'mypassword',
        DRPC_REPSONLINE: '[]'
      }
    }
  ]
};
