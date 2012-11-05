//
// worker.js
//
// A worker process that starts a new forked server instance
// which listens on a unique port

var cluster = require('cluster'),
	Server = require('./server'),
	log = require('./log');

if (cluster.isWorker) {
	// The config is passed through the process environment
	var worker = cluster.worker,
		process = worker.process,
		config = JSON.parse(process.env.config),
		server = new Server(config);
	process.on('message', function (message) {
		if (message.type === 'start') {
			var port = message.port + worker.id;
			server.start(port);
			// Send acknowledgement to the master process
			process.send({ type: 'ack', port: port });
		}
	});
}
else {
	// This file should never be called directly
	log.error('Worker.js not started through forked process.')
}
