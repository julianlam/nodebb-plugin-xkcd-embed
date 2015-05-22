define('admin/plugins/xkcd-embed', ['settings'], function(Settings) {
	'use strict';
	/* globals $, app, socket, require */

	var ACP = {};

	ACP.init = function() {
		Settings.load('xkcd-embed', $('.xkcd-embed-settings'));

		$('#save').on('click', function() {
			Settings.save('xkcd-embed', $('.xkcd-embed-settings'), function() {
				app.alert({
					type: 'success',
					alert_id: 'xkcd-embed-saved',
					title: 'Settings Saved',
					message: 'Please reload your NodeBB to apply these settings',
					clickfn: function() {
						socket.emit('admin.reload');
					}
				});
			});
		});
	};

	return ACP;
});