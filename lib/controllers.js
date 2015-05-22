'use strict';

var Controllers = {};

Controllers.renderAdminPage = function (req, res, next) {
	res.render('admin/plugins/xkcd-embed', {});
};

module.exports = Controllers;