var lib = require('../lib'),
	Class = require('../class'),
	Server = require('../server'),
	fs = require('fs'),
	http = require('http'),
	https = require('https'),
	WebSocketServer = require('websocket').server,
	WSConnection = require('../connections/WSConnection'),
	WSServer = {};


/**
 * @override
 * Constructor
 */
WSServer.init = function (channel, manager, config) {
	if (config.secure) {
		// Check for required config values
		lib.requireOne(config, ['cert', 'key'], ['pfx']);
		var options = {
			key: (typeof config.key === 'string' ? fs.readFileSync(config.key) : config.key),
			cert: (typeof config.cert === 'string' ? fs.readFileSync(config.cert) : config.cert),
			pfx: (typeof config.pfx === 'string' ? fs.readFileSync(config.pfx) : config.pfx),
			requestCert: true
		};
		this.httpServer = https.createServer(options, this.onRequest.bind(this));
	}
	else {
		// Create the internal http server
		this.httpServer = http.createServer(this.onRequest.bind(this));
	}


	// WebSocket-Node server
	this.webSocketServer = new WebSocketServer({
		httpServer: this.httpServer,
		autoAcceptConnections: false
	});

	this._super(channel, manager, config);
};

/**
 * @override
 * Binds the websocket request handler and starts the HTTP server
 * @param {int} port - port number to begin listening for connections on.
 *		If no port number is passed, the server will listen on a random port
 * @param {string} [host] - optional IP address to listen for connections on
 */
WSServer.start = function () {
	var self = this,
		defaultPort = (this.secure ? 443 : 80);
	// Bind the listener for handling new connection requests
	this.webSocketServer.on('request', this.onRequest.bind(this));
	// Start the HTTP server
	this.httpServer.listen(this.port || defaultPort, this.host);

	this._super(this.port || defaultPort);
};

/**
 * @override
 * Ends all open connections to the server, and prevents new incoming requests
 *
 * If {shutdown} is true, the server is completely removed and the HTTP server is closed
 */
WSServer.close = function (shutdown) {
	// Send a close message to all connections
	if (shutdown) {
		// Shutdown the websocket server, and detatch it from the HTTP server
		this.webSocketServer.shutDown();
		this.httpServer.close(this.onClose.bind(this));
	}
	else {
		// Close all open socket connections cleanly
		this.webSocketServer.closeAllConnections();
	}

	this._super(shutdown);
};

/**
 * @override
 * Accepts an incoming connection request
 * and creates a WSConnection object to manage it
 *
 * This method assumes that the request has already been checked
 * for domain validity.  See WSServer.originAllowed for more information
 */
WSServer.accept = function (request) {
	var websocket = request.accept(null, request.origin),
		connection = new WSConnection(this.processID, websocket, this.manager);

	this._super(connection);
};

WSServer.reject = function (request) {
	request.reject(404, 'Unable to connect.');
};

WSServer.getType = function () {
	return 'ws:server';
};

WSServer.onRequest = function (request) {
	// this.fire('request');
	var clientInfo = {
		type: 'websocket',
		version: request.webSocketVersion,
		host: request.host,
		origin: request.origin,
		address: request.remoteAddress,
		resource: request.resourceURL,
		protocols: request.requestedProtocols
	};
	this.verifyRequest(clientInfo, request);
};

// Define the inheritance relationship
module.exports = Server.extend(WSServer);

