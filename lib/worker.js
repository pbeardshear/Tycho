//
// worker.js
//
// A worker process that starts a new forked server instance
// which listens on a unique port

var cluster = require('cluster'),
	TCPServer = require('./servers/TCPServer'),
	UDPServer = require('./servers/UDPServer'),
	WSServer = require('./servers/WebSocketServer'),
	InstanceManager = require('./InstanceManager'),
	constants = require('./constants'),
	Router = require('./router'),
	log = require('./log'),
	lib = require('./lib');


/**
 * Top-level worker namespace
 */
var worker = {};

worker.init = function (config) {
	console.log('WORKER INIT');
	this._worker = cluster.worker;
	this._process = this._worker.process;
	this.master = config.master;

	lib.apply(this, constants);

	this.router = new Router(this._worker.id, config.router);
	this.router.on('message', this.handleMessage.bind(this));

	this.channel = require('events').EventEmitter;

	this.servers = this.initializeServers(config.servers);
	this.servers.on('server:message', this.handleServerMessage.bind(this));

	this.manager = this.initializeManager(config);
	this.manager.on('manager:message', this.handleManagerMessage.bind(this));

	// Notify master
	this.router.send('worker:init', this.master, { worker: this._worker.id });
};


/**
 * @private
 */
worker.start = function () {
	this.servers.emit('server:start');
};

/**
 * @private
 */
worker.pause = function () {
	this.servers.emit('server:pause');
};

/**
 * @private
 */
worker.stop = function () {
	this.servers.emit('server:stop');
};

/**
 * @private
 * Event handler for router messages
 */
worker.handleMessage = function (type, message, source) {
	console.log('Received message:', type, message);
	var namespace = type.split(':')[0];
	switch (namespace) {
		case 'server':
			this.servers.emit(type, message);
			break;
		case 'manager':
		case 'instance':
		case 'connection':
			this.manager.emit(type, message);
			break;
		case 'worker':
			this.executeCommand(type, message);
			break;
		default:
			break;
	}
};

/**
 * @private
 * Event handler for messages on the server channel
 */
worker.handleServerMessage = function (message) {
	var fullType = 'server:' + message.type;
	switch (message.type) {
		case 'connection':
			var connection = message.payload.connection;
			this.manager.emit('manager:new-connection', connection);
			break;
		default:
			break;
	}
	this.router.send(fullType, this.master, message.payload);
};

/**
 * @private
 * Event handler for messages on the manager channel
 */
worker.handleManagerMessage = function (message) {
	console.log('RECEIVING MANAGER MESSAGE', message);
	var fullType = 'manager:' + message.type;
	switch (message.type) {
		case 'broadcast':
		case 'instance-close':
			this.router.broadcast(fullType, message.payload);
			break;
		case 'send':
			this.router.send(fullType, message.dest, message.payload);
			break;
		case 'ready':
			this.router.send('worker:ready', this.master);
			break;
		default:
			console.log('--- --- --- --- Publishing to channel', (message.dest || this.master), '...', message.payload.data);
			this.router.send(fullType, (message.dest || this.master), message.payload.data);
			break;
	}
};

/**
 * @private
 */
worker.executeCommand = function (type, message) {
	var command = type.split(':')[1],
		handler = worker[command];
	if (handler) {
		handler.call(worker, message);
	}
};

/**
 * @private
 */
worker.initializeServers = function (servers) {
	var channel = new this.channel(),
		self = this;
	servers.map(function (config) {
		if (self.connectionTypes.TCP === config.type) {
			tcpPort = config.port;
			return new TCPServer(channel, config);
		}
		if (self.connectionTypes.UDP === config.type) {
			return new UDPServer(channel, config);
		}
		if (self.connectionTypes.WEBSOCKET === config.type) {
			wsPort = config.port;
			return new WSServer(channel, config);
		}
	});
	return channel;
};

/**
 * @private
 */
worker.initializeManager = function (config) {
	var channel = new this.channel(),
		manager = new InstanceManager(channel, config);
	return channel;
};

// ----------------------------------------

if (cluster.isWorker) {
	worker.init(JSON.parse(cluster.worker.process.env.config));
}
else {
	log.error('Worker process should not be started directly.',
		'Please see the documentation at http://pbeardshear.github.io/Tycho/ on how to start worker processes in tycho.');
	process.exit(1);
}




// The config is passed through the process environment
// var worker = cluster.worker,
// 	process = worker.process,
// 	self = { };

// // Add the constants to the global object
// lib.apply(self, constants);

// self.config = JSON.parse(process.env.config);
// self.config.processID = worker.id;
// // Create the servers that will run in this worker
// self.servers = initializeServers(serverChannel, self.config);
// // Create the instance manager for this process
// self.instanceManager = new InstanceManager(instanceChannel, self.config);


// self.commands = {
// 	start: workerStart,
// 	stop: workerStop,
// 	pause: workerPause
// };

// // TODO: Rework to fit in with new routing system
// // Received a message from the router
// process.on('message', function (message) {
// 	if (message.type in self.commands) {
// 		self.commands[message.type].call(self, message.payload, message.id);

// 		process.send({ type: 'ack', id: message.id });
// 	}
// });


// // ----------------------------------------------------------------------------
// /**
//  * Worker commands
//  */
// function workerStart() {
// 	self.servers.forEach(function (server) {
// 		server.start();
// 	})
// }

// function workerStop() {
// 	self.servers.forEach(function (server) {
// 		server.close(true);
// 	});
// }

// function workerPause() {
// 	self.servers.forEach(function (server) {
// 		server.pause();
// 	});
// }


// /**
//  * Helper functions
//  */

// /**
//  * Initialize the servers that this worker will manage
//  * This is very similar to the code used in tycho.js for the master process
//  */
// function initializeServers(config) {
// 	return config.servers.map(function (config) {
// 		if (tycho.connectionTypes.TCP === config.type) {
// 			tcpPort = config.port;
// 			return new TCPServer(config);
// 		}
// 		if (tycho.connectionTypes.UDP === config.type) {
// 			return new UDPServer(config);
// 		}
// 		if (tycho.connectionTypes.WEBSOCKET === config.type) {
// 			wsPort = config.port;
// 			return new WSServer(config);
// 		}
// 	});
// }

