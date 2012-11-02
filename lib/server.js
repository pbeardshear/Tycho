//
// server.js
//

var http = require('http'),
	WebSocketServer = require('websocket').server,
	Connection = require('connection'),
	Instance = require('instance');


module.exports = Server;

/**
 * Constructor
 */
function Server(config) {
	// Server implements evented interface
	implement(this, evented, ['start', 'close', 'request', 'connection']);
	this.instances = {};
	this.connections = {};

	// Create the internal http server
	this.httpServer = http.createServer(function (request, response) {
		// Send static file
		response.send('Nothing now.');
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
Server.prototype.start = function (host, port) {
	// Create the default instance ('Instance Prime')
	// This instance manages all connections until they request
	// to join a specific room
	this.instances.prime = new Instance('prime');

	// Bind the listener for handling new connection requests
	this.webSocketServer.on('request', function (request) {
		this.fire('request');
		if (!this.originAllowed(request.origin)) {
			request.reject();
			return;
		}

		this.accept(request);
	});

	this.httpServer.listen(port || this.port);
	this.fire('start', this);
};

/**
 * Shut down the server
 * {unmount} completely remove the websocket server from the http server
 * You should pass true here if you are not going to be restarting this server
 */
Server.prototype.close = function (unmount) {
	// Send a close message to all connections
};

/**
 * Accept and bind an incoming connection
 * By default, all connections are owned by
 * instance.prime until the game or the user
 * selects an instance.
 */
Server.prototype.accept = function (request) {
	var websocket = request.accept(null, request.origin),
		connection = new Connection(lib.guid(), websocket);

	connection.on('join', this.onConnectionJoin, this);
	this.instances.prime.addConnection(connection);
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
		origin: /.*/
	});
};

/**
 * Event handlers
 */
Server.prototype.onConnectionJoin = function (connection, room) {
	// Remove the connection from its current room, if it has one
	connection.fireEvent('leave', connection);
	// Check if this is the first time this object has been used
	// to create a room
	if (!room.__tid__) {
		room.__tid__ = lib.guid();
		// Create a matching instance which will manage the connection
		this.instances[room.__tid__] = new Instance(room.__tid__);	
	}
	
	this.instances[room.__tid__].addConnection(connection);
};