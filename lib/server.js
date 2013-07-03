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
	this.acceptingConnections = false;
	this.port = config.port;
	this.host = config.host;

	lib.apply(this, config);

	this.channel = channel;
	this.channel.on('server:start', this.start.bind(this));
	this.channel.on('server:pause', this.pause.bind(this));
	this.channel.on('server:stop', this.close.bind(this));

	this.connections = new EventEmitter();
	this.connections.on('connection:message', this.handleConnectionMessage.bind(this));
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
	this.channel.emit('server:message', {
		type: 'connection',
		payload: {
			connection: connection
		}
	});
};

/**
 * Handle message from connections attached to this server
 */
Server.handleConnectionMessage = function (message) {
	switch (message.type) {
		case 'close':
			this.channel.emit('server:message', {
				type: 'close',
				payload: message.payload
			});
			break;
		default:
			break;
	}
}

// Expose the Server class
module.exports = Class.extend(Server);
