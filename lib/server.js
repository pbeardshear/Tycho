//
// server.js
//

var http = require('http'),	
	Class = require('./class'),
	Connection = require('./connection'),
	Instance = require('./instance'),
	EventEmitter = require('events').EventEmitter,
	lib = require('./lib'),
	Server = {};


/**
 * Constructor
 */
Server.init = function (channel, config) {
	var self = this;
	// Server implements evented interface
	// implement(this, evented, ['start', 'close', 'request', 'connection', 'pause']);
	this.acceptingConnections = false;
	// this.instances = {};
	// this.connections = {};
	this.port = config.port;
	this.host = config.host;

	lib.apply(this, config);
	// Add default config values
	this.applyDefaults();

	this.channel = channel;
	this.channel.on('server:start', this.start.bind(this));
	this.channel.on('server:pause', this.pause.bind(this));
	this.channel.on('server:stop', this.close.bind(this));

	this.connectionChannel = new EventEmitter();
	this.connectionChannel.on('connection:message', this.handleConnectionMessage.bind(this));
};

/**
 * Start the http server, as well as the socket server
 * By default, requests are rejected unless they are
 * specifically allowed by request.origin
 */
Server.start = function (port) {
	this.port = port;
	this.acceptingConnections = true;
	console.log('==== GOT START');
	this.channel.emit('server:message', {
		type: 'start'
	});
};

/**
 * Shut down the server
 * {shutdown} completely remove the websocket server from the http server
 * You should pass true here if you are not going to be restarting this server
 */
Server.close = function (shutdown) {
	this.acceptingConnections = false;
};

/**
 * Deny all incoming connection requests to the server
 * and suspend communication with all existing connections
 */
Server.pause = function () {
	this.acceptingConnections = false;
	this.channel.emit('server:message', {
		type: 'pause'
	});
};

/**
 * Accept and bind an incoming connection
 * By default, all connections are owned by
 * instance.master until the game or the user
 * selects an instance.
 */
Server.accept = function (connection) {
	// this.connections[connection.id] = connection;

	// // TODO: Auto-assignment of connections, load-balancing
	// connection.on('join', this.onConnectionJoin, this);

	this.channel.emit('server:message', {
		type: 'connection',
		payload: {
			connection: connection
		}
	});
};


/**
 * Apply default server settings to fill in any configuration
 * values the user did not supply
 */
Server.applyDefaults = function () {
	lib.apply(this, {
		port: process.env.PORT || 3000,
		origin: /.*/,
		root: '/'
	});
};

/**
 * Event handlers
 */
Server.handleConnectionMessage = function (message) {
	var connection = message.payload.connection;
	switch (message.type) {
		case 'join':
			this.onConnectionJoin(connection, message.payload.room, message.payload.deferred);
			break;
		case 'leave':
			break;
		case 'close':
			break;
		default:
			break;
	}
};

Server.onConnectionJoin = function (connection, roomName, deferred) {
	// TODO: emit event
	InstanceManager.register(roomName)
		.then(function (instance) {
			instance.addConnection(connection);
			deferred.resolve(instance);
		})
		.fail(function (error) {
			deferred.reject(error);
		});
};

Server.onClose = function () {
	this.channel.emit('server:message', {
		type: 'close'
	});
};

// Expose the Server class
module.exports = Class.extend(Server);
