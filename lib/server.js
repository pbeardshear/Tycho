//
// server.js
//

var http = require('http'),
	Class = require('./class'),
	Connection = require('./connection'),
	Instance = require('./instance'),
	EventEmitter = require('events').EventEmitter,
	lib = require('./lib'),
	log = require('./log'),
	Server = {};


/**
 * Constructor
 */
Server.init = function (channel, manager, config) {
	this.acceptingConnections = false;
	this.maxConnections = 1000;
	this.port = config.port;
	this.host = config.host;

	lib.apply(this, config);

	this.channel = channel;
	this.channel.on('server:start', this.start.bind(this));
	this.channel.on('server:pause', this.pause.bind(this));
	this.channel.on('server:resume', this.resume.bind(this));
	this.channel.on('server:stop', this.close.bind(this));
	this.channel.on('server:heartbeat', this.replyHeartbeat.bind(this));

	this.manager = manager;
};

/**
 * Start the http server, as well as the socket server
 * By default, requests are rejected unless they are
 * specifically allowed by request.origin
 */
Server.start = function (port) {
	this.port = port;
	this.acceptingConnections = true;
	this.channel.emit('server:message', 'start');
};

/**
 * Shut down the server
 * {shutdown} completely remove the websocket server from the http server
 * You should pass true here if you are not going to be restarting this server
 */
Server.close = function (shutdown) {
	this.acceptingConnections = false;
	this.channel.emit('server:message', 'stop', this.getType());
	this.manager.emit('server:message', 'stop', this.getType());
	if (shutdown) {
		this.manager.emit('server:message', 'shutdown', this.getType());
	}
};

/**
 * Deny all incoming connection requests to the server
 * and suspend communication with all existing connections
 */
Server.pause = function () {
	log.out('Pausing server...', this.getType());
	this.acceptingConnections = false;
	this.channel.emit('server:message', 'pause', this.getType());
	this.manager.emit('server:message', 'pause', this.getType());
};

/**
 * Reaccept connections to this server
 */
Server.resume = function () {
	log.out('Resuming server...', this.getType());
	this.acceptingConnections = true;
	this.channel.emit('server:message', 'resume', this.getType());
	this.manager.emit('server:message', 'resume', this.getType());
};

/**
 * Reply to a health check from the worker
 */
Server.replyHeartbeat = function () {
	this.channel.emit('server:message', 'online', this.getType());
};

Server.verifyRequest = function (request, connection) {
	var self = this;
	this.manager.emit('server:message', 'request', request, function (allow) {
		if (allow && self.acceptingConnections) {
			log.out('Accepting connection...', self.acceptingConnections);
			self.accept(connection);
		}
		else {
			log.out('Rejecting connection...', self.acceptingConnections);
			self.reject(connection);
		}
	});
};

/**
 * Accept and bind an incoming connection
 * By default, all connections are owned by
 * instance.master until the game or the user
 * selects an instance.
 */
Server.accept = function (connection) {
	this.manager.emit('server:message', 'connect', connection, this.getType());
};

/**
 * @abstract
 */
Server.reject = function (connection) { }

/**
 * @abstract
 */
Server.getType = function () { };

// Expose the Server class
module.exports = Class.extend(Server);
