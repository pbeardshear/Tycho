//
// test entrypoint
//

module.exports = function (tycho) {
	// Tycho is ready
	console.log('ready');

	tycho.on('connect', function (connection) {
		connection.on('message', function (message) {
			console.log('---- ---- RECEIVED MESSAGE IN DEV CODE', message);
		});
	});
};