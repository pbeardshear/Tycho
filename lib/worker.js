//
// worker.js
//
// A worker process that starts a new forked server instance
// which listens on a unique port

var cluster = require('cluster'),
	Server = require('./server'),
	log = require('./log'),
	lib = require('./lib');


if (cluster.isWorker) {
	// The config is passed through the process environment
	var worker = cluster.worker,
		process = worker.process,
		config = JSON.parse(process.env.config),
		server = new Server(config);

	// Valid command messages that the worker accepts 
	// from the managing instance
	var commands = {
		start: function (message) {
			var port = message.port + worker.id;
			server.start(port);
			return { port: port };
		},

		stop: function () {
			// Shutdown all connections
			server.close(true);
			// TODO: consider implementing a timeout to handle long-lived connections
		},

		pause: function () {
			server.pause();
		}
	};

	process.on('message', function (message) {
		if (message.type in commands) {
			var response = commands[message.type](message);
			// Send ack back to server with response
			process.send(lib.apply({ type: 'ack', id: message.id }, response || {}));
		}
	});
}
else {
	// This file should never be called directly
	log.error('Worker.js not started through forked process.')
}
