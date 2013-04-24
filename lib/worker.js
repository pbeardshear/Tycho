//
// worker.js
//
// A worker process that starts a new forked server instance
// which listens on a unique port

var cluster = require('cluster'),
	TCPServer = require('servers/TCPServer'),
	UDPServer = require('servers/UDPServer'),
	WSServer = require('servers/WebSocketServer'),
	log = require('./log'),
	lib = require('./lib');

if (cluster.isWorker) {
	// The config is passed through the process environment
	var worker = cluster.worker,
		process = worker.process,
		config = JSON.parse(process.env.config),
		connectionTypes = JSON.parse(process.env.connectionTypes),
		servers = initializeServers(connectionTypes, config);

	// Valid command messages that the worker accepts 
	// from the managing instance
	var commands = {
		start: function (message) {
			// var port = message.port + worker.id;
			servers.forEach(function (server) {
				server.start();
			});
			return { port: port };
		},

		stop: function () {
			// Shutdown all connections
			servers.forEach(function (server) {
				server.close(true);
			});
			// TODO: consider implementing a timeout to handle long-lived connections
		},

		pause: function () {
			servers.forEach(function (server) {
				server.pause();
			});
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


// -----------------------------------------
/**
 * Helper functions
 */

/**
 * Initialize the servers that this worker will manage
 * This is very similar to the code used in tycho.js for the master process
 */
function initializeServers(connectionTypes, config) {
	var index = config.serverIndex,
		servers = [];

	if (connectionTypes.TCP in index) {
		servers.push( new TCPServer(index[connectionTypes.TCP]) );
	}
	if (connectionTypes.UDP in index) {
		servers.push( new UDPServer(index[connectionTypes.UDP]) );
	}
	if (connectionTypes.WEBSOCKET in index) {
		servers.push( new WSServer(index[connectionTypes.WEBSOCKET]) );
	}

	return servers;
}

