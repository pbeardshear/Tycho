//
// worker.js
//
// A worker process that starts a new forked server instance
// which listens on a unique port

var cluster = require('cluster'),
	TCPServer = require('./servers/TCPServer'),
	UDPServer = require('./servers/UDPServer'),
	WSServer = require('./servers/WebSocketServer'),
	Instance = require('./instance'),
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
	this._worker = cluster.worker;
	this._process = this._worker.process;
	this.master = config.master;
	this.serverCount = config.servers.length;

	lib.apply(this, constants);

	this.channel = require('events').EventEmitter;

	this.signals = {};
	this.connections = {};
	this.instances = {};
	this.instanceChannel = new this.channel();
	this.instanceChannel.on('instance:message', this.handleInstanceMessage.bind(this));

	this.store = new Store(this._worker.id, config.store, ['broadcast']);
	this.store.on('message', this.handleMessage.bind(this));

	this.servers = this.initializeServers(config.servers);
	this.servers.on('server:message', this.handleServerMessage.bind(this));

	this.store.send('worker:init', this.master, { worker: this._worker.id });
	this.store.send('worker:ready', this.master, { worker: this._worker.id });
};


/**
 * @private
 */
worker.start = function () {
	this.registerInstance('__empty');	//  TODO: Make this a config option
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
 * Event handler for store messages
 */
worker.handleMessage = function (type, message, source) {
	console.log('Received message:', type, message);
	var namespace = type.split(':')[0];
	switch (namespace) {
		case 'server':
			this.servers.emit(type, message);
			break;
		case 'connection':
		case 'instance':
			var command = type.split(':')[1];
			this.dispatchCommand(command, message);
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
 * Send a command down to an instance
 */
worker.dispatchCommand = function (command, message) {
	var instanceID = message.address.instanceID,
		instance = this.instances[instanceID];
	if (instance) {
		switch (command) {
			case 'send':
				instance.send(message.address, message.payload);
				break;
			case 'broadcast':
				instance.broadcast(message.payload);
				break;
			case 'close':
				instance.close();
				this.store.remove(instanceID);
				break;
			case 'join':
				var roomName = message.room,
					connection = this.connections[address.connectionID];
				if (instance.isDefault) {
					instance.dropConnection(connection);
				}

				if (roomName in this.instances) {
					this.instances[roomName].addConnection(connection);
				}
				else {
					var newInstance = this.registerInstance(roomName);
					newInstance.addConnection(connection);
				}
				break;
			case 'leave':
				var connection = this.connections[address.connectionID];
				instance.dropConnection(connection);
				if (connection.getInstanceCount() === 0) {
					this.instances['__empty'].addConnection(connection);
				}
				break;
			default:
				break;
		}
	}
}

/**
 * @private
 * Event handler for messages on the server channel
 */
worker.handleServerMessage = function (message) {
	var eventType = 'server:' + message.type;
	switch (message.type) {
		case 'connection':
			var connection = message.payload.connection,
				defaultInstance = this.instances['__empty'];
			this.connections[connection.id] = connection;
			defaultInstance.addConnection(connection);
			this.store.set(defaultInstance.id, connection.id, connection.getAddress(),
				function (err, res) {
					if (!err) {
						this.store.send(eventType, this.master, { connection: connection.id });
					}
				});
			break;
		case 'start':
			this.signals.start += 1;
			if (this.signals.start === this.serverCount) {
				this.store.send('worker:start', this.master);
			}
			break;
		case 'close':
			this.store.send('connection:close', this.master, { connection: message.payload.connection.id });
		default:
			break;
	}
};


/**
 * @private
 */
worker.handleInstanceMessage = function (message) {
	var eventType = 'instance:' + message.type;
	switch (message.type) {
		case 'close':
			this.store.broadcast('instance:close', {
				instance: message.payload.instance.id
			});
			break;
		case 'message':
			this.store.send(message.type, this.master, { message: message.payload.data });
			break;
		case 'dropconnection':
			// Drop event came from the connection, which means it was closed client-side
			var instanceID = message.payload.instance.id,
				connectionID = message.payload.connection.id;
			// TODO: Consider allowing reconnects
			this.store.hdel(instanceID, connectionID);
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
 * Instance methods
 */
worker.registerInstance = function (name) {
	if (!(name in this.instances)) {
		this.instances[name] = new Instance(name, this.instanceChannel);	
	}
	else {
		this.store.send('worker:error', this.master, {
			// TODO: Determine appropriate way to respond with errors
		});
	}
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
