//
// tcpcannon.js
//
// Simple client connection generator for testing servers
//

var net = require('net'),
	options = {};
	clients = [],
	loading = null,
	barrage = null;

exports.aim = function (port, host) {
	options.port = port;
	options.host = host;

	process.on('uncaughtException', function (err) {
		// Catch failed connections
		if (err.code === 'ECONNREFUSED' && loading) {
			loading(err);
		}
		else {
			throw err;
		}
	})
};

exports.load = function (count, done) {
	for (var i = 0; i < count; i++) {
		var connected = 0;
		var client = net.connect(options, function () {
			connected++;
			if (connected === count) {
				done && done();
			}
		});
		clients.push(client);
	}
	loading = done;
};

exports.empty = function () {
	if (clients.length > 0) {
		for (var i = 0; i < clients.length; i++) {
			clients[i].end();
		}
		clients = [];
	}
};

exports.fire = function () {
	// Release the kraken!
	if (clients.length > 0) {
		var i = 0;
		barrage = setInterval(function () {
			if (clients[i].writable) {
				clients[i].write(Math.random().toString(36));
				i = (i + 1) % clients.length;
			}
		}, 5);
	}
};

exports.stop = function () {
	if (barrage) {
		clearInterval(barrage);
		barrage = null;
	}
};

exports.power = function () {
	return clients.length;
};
