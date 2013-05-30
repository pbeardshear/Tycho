//
// server.js
//

var http = require('http'),	
	Class = require('./class'),
	Connection = require('./connection'),
	Instance = require('./instance'),
	implement = require('./implement'),
	evented = require('./event'),
	lib = require('./lib'),
	Server = {};


/**
 * Constructor
 */
Server.init = function (config) {
	var self = this;
	// Server implements evented interface
	implement(this, evented, ['start', 'close', 'request', 'connection', 'pause']);
	this.acceptingConnections = false;
	this.instances = {};
	this.connections = {};
	this.port = config.port;
	this.host = config.host;

	lib.apply(this, config);
	// Add default config values
	this.applyDefaults();
}

/**
 * Start the http server, as well as the socket server
 * By default, requests are rejected unless they are
 * specifically allowed by request.origin
 */
Server.start = function (port) {
	this.port = port;
	this.acceptingConnections = true;
	this.fireOnce('start', this);
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
	this.fire('pause');
};

/**
 * Accept and bind an incoming connection
 * By default, all connections are owned by
 * instance.master until the game or the user
 * selects an instance.
 */
Server.accept = function (connection) {
	this.connections[connection.id] = connection;

	// TODO: Auto-assignment of connections, load-balancing
	connection.on('join', this.onConnectionJoin, this);
	this.fire('connection', connection);
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
Server.onConnectionJoin = function (connection, roomName, callback) {
	var instance = InstanceManager.register(roomName);
	if (instance) {
		// Instance was created successfully, or already existed
		instance.addConnection(connection);
		callback({ success: true });
	}
	else {
		// instance will be an error object
		callback({ success: false, error: instance });
	}
};

Server.onClose = function () {
	this.fire('close');
};

// Expose the Server class
module.exports = Class.extend(Server);
