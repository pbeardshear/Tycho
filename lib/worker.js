//
// worker.js
//
// A worker process that starts a new forked server instance
// which listens on a unique port

var cluster = require('cluster'),
	TCPServer = require('./servers/TCPServer'),
	UDPServer = require('./servers/UDPServer'),
	WSServer = require('./servers/WebSocketServer'),
	Manager = require('./manager'),
	constants = require('./constants'),
	Store = require('./store'),
	log = require('./log'),
	lib = require('./lib');


/**
 * Top-level worker namespace
 */
var worker = {};

worker.init = function (config) {
	console.log('WORKER INIT');
	console.log('WORKER config', config);
	this._worker = cluster.worker;
	this._process = this._worker.process;
	this.master = config.store.master;
	this.serverCount = config.servers.length;

	lib.apply(this, constants);

	this.channel = require('events').EventEmitter;

	this.signals = {};

	this.store = new Store(this._worker.id, config.store, ['broadcast']);
	this.store.on('message', this.handleMessage.bind(this));

	this.manager = this.initializeManager(this.store);

	this.servers = this.initializeServers(config.servers, this.manager);
	this.servers.on('server:message', this.handleServerMessage.bind(this));

	// this.store.send('worker:init', this.master, { worker: this._worker.id });
	this.store.send('worker:ready', this.master);

	this.onReady = require(config.run);
};


/**
 * @private, @command
 */
worker.start = function () {
	this.signals.START = 0;
	this.servers.emit('server:start');
};

/**
 * @private, @command
 */
worker.pause = function () {
	this.servers.emit('server:pause');
};

/**
 * @private, @command
 */
worker.stop = function () {
	this.servers.emit('server:stop');
};

/**
 * @private, @command
 */
worker.resume = function () {
	this.servers.emit('server:resume');
};

/**
 * @private, @command
 */
worker.heartbeat = function (id) {
	var self = this;
	this.signals.ONLINE = [];
	this.servers.emit('server:heartbeat');
	setTimeout(function () {
		self.store.send('worker:heartbeat:' + id, self.master, self.signals.ONLINE);
	}, 1000);
};

/**
 * @private, @command
 */
worker.stats = function (id) {
	log.out('Compiling worker stats...');
	this.store.send('worker:stats:' + id, this.master, [
		this._process.pid,		// worker process ID
		this._process.memoryUsage(),	// total heap size
		this._manager.getConnectionCount()	// active connections
	]);
};

/**
 * @private
 * Event handler for store messages
 */
worker.handleMessage = function (type, message, source) {
	log.out('Received master message');
	this.executeCommand(type, message);
};

/**
 * @private
 * Event handler for messages on the server channel
 */
worker.handleServerMessage = function (type) {
	var args = Array.prototype.slice.call(arguments, 1);
	switch (type) {
		case 'start':
			this.signals.START += 1;
			if (this.signals.START === this.serverCount) {
				this.store.send('server:start', this.master);
				this.onReady(this.manager);
			}
			break;
		case 'stop':
			this.store.send('server:stop', this.master, { type: args[0] });
			break;
		case 'pause':
			this.store.send('server:pause', this.master, { type: args[0] });
			break;
		case 'online':
			var server = args[0];
			this.signals.ONLINE.push(server);
			break;
		default:
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
worker.initializeServers = function (servers, manager) {
	var channel = new this.channel(),
		self = this;
	servers.map(function (config) {
		if (self.connectionTypes.TCP === config.type) {
			tcpPort = config.port;
			return new TCPServer(channel, manager, config);
		}
		if (self.connectionTypes.UDP === config.type) {
			return new UDPServer(channel, manager, config);
		}
		if (self.connectionTypes.WEBSOCKET === config.type) {
			wsPort = config.port;
			return new WSServer(channel, manager, config);
		}
	});
	return channel;
};

worker.initializeManager = function (store) {
	var channel = new this.channel();
	// Direct reference to manager object
	this._manager = new Manager(store, channel);
	return channel;
}

// ----------------------------------------

if (cluster.isWorker) {
	worker.init(JSON.parse(cluster.worker.process.env.config));
}
else {
	log.error('Worker process should not be started directly.',
		'Please see the documentation at http://pbeardshear.github.io/Tycho/ on how to start worker processes in tycho.');
	process.exit(1);
}
