/* jshint indent: 4 */

var	request = require('request'),
    async = module.parent.require('async'),
    winston = module.parent.require('winston'),
    S = module.parent.require('string'),
    meta = module.parent.require('./meta'),

    xkcdRegex = /xkcd#\d+/gm,
    Embed = {},
    cache, appModule;

Embed.init = function(data, callback) {
    appModule = data.app;
	callback();
};

Embed.parse = function(data, callback) {
    var xkcdKeys = [],
        raw = data && data.postData && data.postData.content,
        matches, cleanedText;

    if (!raw) {
        callback(null, data);
    }

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
                raw += html;
                data.postData.content = raw;
                callback(null, data);
            });
        } else {
            winston.warn('Encountered an error parsing xkcd embed codes, not continuing');
            callback(null, data);
        }
    });
};

var getComic = function(xkcdKey, callback) {
    var comicNum = xkcdKey.split('#')[1];

    request.get({
        url: 'https://xkcd.com/' + comicNum + '/info.0.json',
        json: true
    }, function(err, response, body) {
        if (response.statusCode === 200) {
            callback(null, body);
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
