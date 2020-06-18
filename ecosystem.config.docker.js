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
      "log_date_format" : "YYYY-MM-DD HH:mm:ss"
    },
    {
      name      : 'My Nano Ninja - Cron',
      script    : 'cron.js',
      "log_date_format" : "YYYY-MM-DD HH:mm:ss"
    }
  ]
};
