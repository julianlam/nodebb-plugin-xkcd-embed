/* jshint indent: 4 */

var	request = require('request'),
    async = module.parent.require('async'),
    url = module.parent.require('url'),
    winston = module.parent.require('winston'),
    S = module.parent.require('string'),
    meta = module.parent.require('./meta'),

    controllers = require('./lib/controllers'),
    xkcdRegex = /xkcd#\d+/gm,
    Embed = {
        settings: {
            display: 'append'    // This is the default, but can be overridden in the ACP
        }
    },
    cache, appModule;

Embed.init = function(data, callback) {
    var router = data.router,
        hostMiddleware = data.middleware,
        hostControllers = data.controllers;
        
    appModule = data.app;

    router.get('/admin/plugins/xkcd-embed', hostMiddleware.admin.buildHeader, controllers.renderAdminPage);
    router.get('/api/admin/plugins/xkcd-embed', controllers.renderAdminPage);

    meta.settings.get('xkcd-embed', function(err, settings) {
        if (!err) {
            winston.verbose('[plugin/xkcd-embed] Settings loaded');
            Embed.settings = settings;
        }
    });

    callback();
};

Embed.addAdminNavigation = function(header, callback) {
    header.plugins.push({
        route: '/plugins/xkcd-embed',
        name: 'XKCD Embed'
    });

    callback(null, header);
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
            // Filter out non-existant comics, and change the image link to https only
            var urlObj;
            comics = comics.filter(Boolean).map(function(comic) {
                urlObj = url.parse(comic.img);
                urlObj.protocol = 'https:';
                comic.img = url.format(urlObj);

                return comic;
            });

            if (Embed.settings.display === 'replace') {
                async.each(comics, function(comic, next) {
                    appModule.render('partials/comic-inline', comic, function(err, html) {
                        data.postData.content = data.postData.content.replace(new RegExp('xkcd#' + comic.num, 'g'), html);
                        next();
                    });
                }, function(err) {
                    callback(null, data);
                });
            } else {
                appModule.render('partials/comics-block', {
                    comics: comics
                }, function(err, html) {
                    raw += html;
                    data.postData.content = raw;
                    callback(null, data);
                });
            }
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
