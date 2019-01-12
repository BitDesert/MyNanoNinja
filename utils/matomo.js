var MatomoTracker = require('matomo-tracker');

exports = module.exports = function analytics(options) {
    var matomo = new MatomoTracker(options.siteId, options.matomoUrl);

    return function track(req, res, next) {
        // get the domain and url
        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        
        matomo.track({
            url: fullUrl,
            action_name: 'API',
            ua: req.header('User-Agent'),
            lang: req.header('Accept-Language'),
            cvar: JSON.stringify({
              '1': ['API version', 'v1'],
              '2': ['HTTP method', req.method]
            }),
            token_auth: options.matomoToken,
            cip: req.ip

        });
        next();
    }
}