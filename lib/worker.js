//
// worker.js
//
// A worker process that starts a new forked server instance
// which listens on a unique port

var cluster = require('cluster'),
	TCPServer = require('servers/TCPServer'),
	UDPServer = require('servers/UDPServer'),
	WSServer = require('servers/WebSocketServer'),
	constants = require('./constants'),
	Router = require('./router'),
	log = require('./log'),
	lib = require('./lib');

if (!cluster.isWorker) {
	log.error('Worker process should not be started directly.',
		'Please see the documentation at http://pbeardshear.github.io/Tycho/ on how to start worker processes in tycho.');
	process.exit(1);
}

// The config is passed through the process environment
var worker = cluster.worker,
	process = worker.process,
	self = { };

// Add the constants to the global object
lib.apply(self, constants);
self.config = JSON.parse(process.env.config);
self.config.processID = worker.id;
// Create the servers that will run in this worker
self.servers = initializeServers(self.config);
// Create the instance manager for this process
self.instanceManager = new InstanceManager(self.config);


self.commands = {
	start: workerStart,
	stop: workerStop,
	pause: workerPause
};

// TODO: Rework to fit in with new routing system
// Received a message from the router
process.on('message', function (message) {
	if (message.type in self.commands) {
		self.commands[message.type].call(self, message.payload, message.id);

		process.send({ type: 'ack', id: message.id });
	}
});


// ----------------------------------------------------------------------------
/**
 * Worker commands
 */
function workerStart() {
	self.servers.forEach(function (server) {
		server.start();
	})
}

function workerStop() {
	self.servers.forEach(function (server) {
		server.close(true);
	});
}

function workerPause() {
	self.servers.forEach(function (server) {
		server.pause();
	});
}


/**
 * Helper functions
 */

/**
 * Initialize the servers that this worker will manage
 * This is very similar to the code used in tycho.js for the master process
 */
function initializeServers(config) {
	return config.servers.map(function (config) {
		if (tycho.connectionTypes.TCP === config.type) {
			tcpPort = config.port;
			return new TCPServer(config);
		}
		if (tycho.connectionTypes.UDP === config.type) {
			return new UDPServer(config);
		}
		if (tycho.connectionTypes.WEBSOCKET === config.type) {
			wsPort = config.port;
			return new WSServer(config);
		}
	});
}

