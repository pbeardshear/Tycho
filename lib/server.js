//
// server.js
//

var http = require('http'),
	WebSocketServer = require('websocket').server,
	send = require('send'),
	Connection = require('./connection'),
	Instance = require('./instance'),
	implement = require('./implement'),
	evented = require('./event'),
	lib = require('./lib');


module.exports = Server;

/**
 * Constructor
 */
function Server(config) {
	var self = this;
	// Server implements evented interface
	implement(this, evented, ['start', 'close', 'request', 'connection', 'pause']);
	this.acceptingConnections = false;
	this.instances = {};
	this.connections = {};

	// Create the internal http server
	this.httpServer = http.createServer(function (req, res) {
		// Grab the non-querystring portion of the url
		var url = req.url.split('?')[0];
		switch (url) {
			case '/tycho/tycho.js':
				send(req, __dirname + '/tycho-client.js').pipe(res);
				break;
			case '/tycho/message.js':
				send(req, __dirname + '/message-client.js').pipe(res);
				break;
			default:
				send(req, req.url).root(process.cwd() + self.root).pipe(res);
				break;
		}
	});

	// WebSocket-Node server
	this.webSocketServer = new WebSocketServer({
		httpServer: this.httpServer,
		autoAcceptConnections: false
	});

	lib.apply(this, config);
	// Add default config values
	this.applyDefaults();
}

/**
 * Start the http server, as well as the socket server
 * By default, requests are rejected unless they are 
 * specifically allowed by request.origin
 */
Server.prototype.start = function (port) {
	// Create the default master instance
	// This instance manages all connections until they request
	// to join a specific room
	this.instances.master = new Instance('master');

	// Bind the listener for handling new connection requests
	this.webSocketServer.on('request', function (request) {
		this.fire('request');
		if (!this.originAllowed(request.origin)) {
			request.reject(401, "Invalid request.");
			return;
		}

		this.accept(request);
	});

	this.port = port || this.port;
	this.httpServer.listen(this.port);
	this.acceptingConnections = true;
	this.fire('start', this);
};

/**
 * Shut down the server
 * {shutdown} completely remove the websocket server from the http server
 * You should pass true here if you are not going to be restarting this server
 */
Server.prototype.close = function (shutdown) {
	this.acceptingConnections = false;
	// Send a close message to all connections
	if (shutdown) {
		this.webSocketServer.shutDown();
		this.httpServer.close(this.onClose.bind(this));
	}
	else {
		this.webSocketServer.closeAllConnections();
	}
};

/**
 * Deny all incoming connection requests to the server
 * and suspend communication with all existing connections
 */
Server.prototype.pause = function () {
	this.acceptingConnections = false;
	this.fire('pause');
};

/**
 * Accept and bind an incoming connection
 * By default, all connections are owned by
 * instance.master until the game or the user
 * selects an instance.
 */
Server.prototype.accept = function (request) {
	if (!this.acceptingConnections) {
		// Not accepting requests at this time
		request.reject(404, "Not accepting connections.");
		return;
	}
	var websocket = request.accept(null, request.origin),
		connection = new Connection(lib.guid(), websocket);

	connection.on('join', this.onConnectionJoin, this);
	this.instances.master.addConnection(connection);
	this.fire('connection', this, connection);
};

/**
 * Detects connection request origin
 * Returns true if the connection is coming from an accepted domain
 */
Server.prototype.originAllowed = function (request) {
	return request.origin.match(this.origin);
};

/**
 * Apply default server settings to fill in any configuration
 * values the user did not supply
 */
Server.prototype.applyDefaults = function () {
	lib.apply(this, {
		port: process.env.PORT || 3000,
		origin: /.*/,
		root: '/'
	});
};

/**
 * Event handlers
 */
Server.prototype.onConnectionJoin = function (connection, room) {
	// Remove the connection from its current room, if it has one
	connection.leave();
	// Check if this is the first time this object has been used
	// to create a room
	if (!room.__tid__) {
		room.__tid__ = lib.guid();
		// Create a matching instance which will manage the connection
		this.instances[room.__tid__] = new Instance(room.__tid__);	
	}
	
	this.instances[room.__tid__].addConnection(connection);
};

Server.prototype.onClose = function () {
	this.fire('close');
};