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
self.instanceManager = initializeManager(self.config);

self.commands = {
	start: workerStart,
	stop: workerStop,
	pause: workerPause,
	clientmessage: receiveMessage
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

function receiveMessage(payload) {
	// payload is of the form
	var instanceID = payload[0],
		connectionID = payload[1],
		message = payload[2];
	self.instanceManager.emit('forward-client-message', instanceID, connectionID, message);
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

/**
 *
 */
function initializeManager(config) {
	var manager = new InstanceManager();

	manager.on('notify-instance-create', broadcastMessage.bind(this, 'notify-instance-create'));
	manager.on('notify-connection-join', broadcastMessage.bind(this, 'notify-connection-join'));
	manager.on('notify-instance-remove', broadcastMessage.bind(this, 'notify-instance-remove'));
	manager.on('notify-connection-leave', broadcastMessage.bind(this, 'notify-connection-leave'));
	manager.on('pipe', forwardMessage);

	return manager;
}

// --------------------------------------------------------
/**
 * Worker interface for router commands
 * This will probably be refactored
 */
function broadcastMessage() {
	var args = Array.prototype.slice.call(arguments, 1);
	process.send({
		type: 'broadcast',
		payload: args
	});
}

function forwardMessage(workerID, instanceID, connectionID, message) {
	process.send({
		type: 'clientmessage',
		destination: workerID,
		payload: [instanceID, connectionID, message]
	});
}


