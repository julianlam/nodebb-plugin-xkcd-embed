/* jshint indent: 4 */

var	request = require('request'),
    async = module.parent.require('async'),
    winston = module.parent.require('winston'),
    S = module.parent.require('string'),
    meta = module.parent.require('./meta'),

    xkcdRegex = /xkcd#\d+/gm,
    Embed = {},
    cache, appModule;

Embed.init = function(app, middleware, controllers) {
    appModule = app;
};

Embed.parse = function(raw, callback) {
    var xkcdKeys = [],
        matches, cleanedText;

    cleanedText = S(raw).stripTags().s;
    matches = cleanedText.match(xkcdRegex);

    if (matches && matches.length) {
        matches.forEach(function(match) {
            if (xkcdKeys.indexOf(match) === -1) {
                xkcdKeys.push(match);
            }
        });
    }

    async.map(xkcdKeys, function(xkcdKey, next) {
        if (cache.has(xkcdKey)) {
            next(null, cache.get(xkcdKey));
        } else {
            getComic(xkcdKey, function(err, xkcdObj) {
                if (err) {
                    return next(err);
                }

                cache.set(xkcdKey, xkcdObj);
                next(err, xkcdObj);
            });
        }
    }, function(err, comics) {
        if (!err) {
            // Filter out non-existant comics
            comics = comics.filter(function(issue) {
                return issue;
            });

            appModule.render('partials/comics-block', {
                comics: comics
            }, function(err, html) {
                callback(null, raw += html);
            });
        } else {
            winston.warn('Encountered an error parsing xkcd embed codes, not continuing');
            callback(null, raw);
        }
    });
};

var getComic = function(xkcdKey, callback) {
    var comicNum = xkcdKey.split('#')[1];
    console.log('getting comic', comicNum);

    request.get({
        url: 'https://xkcd.com/' + comicNum + '/info.0.json'
    }, function(err, response, body) {
        if (response.statusCode === 200) {
            callback(null, JSON.parse(body));
        } else {
            callback(err);
        }
    });
};

// Initial setup
cache = require('lru-cache')({
    maxAge: 1000*60*60*24,
    max: 100
});

module.exports = Embed;