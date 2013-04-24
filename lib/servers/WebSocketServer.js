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
 * Constructor
 */
WSServer.init = function (config) {
	if (config.secure) {
		// Check for required config values
		lib.requireOne(config, ['cert', 'key'], 'pfx');
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

	this._super(config);
};

/**
 * Binds the websocket request handler and starts the HTTP server
 * @param {int} port - port number to begin listening for connections on.
 *		If no port number is passed, the server will listen on a random port
 * @param {string} [host] - optional IP address to listen for connections on
 */
WSServer.start = function () {
	var defaultPort = (this.secure ? 443 : 80);
	// Bind the listener for handling new connection requests
	this.webSocketServer.on('request', function (request) {
		this.fire('request');
		if (!this.originAllowed(request.origin)) {
			request.reject(401, "Invalid request.");
			return;
		}

		this.accept(request);
	});
	// Start the HTTP server
	this.httpServer.listen(this.port || defaultPort, host);

	this._super(this.port || defaultPort);
};

/**
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
 * Accepts an incoming connection request
 * and creates a WSConnection object to manage it
 *
 * This method assumes that the request has already been checked
 * for domain validity.  See WSServer.originAllowed for more information
 */
WSServer.accept = function (request) {
	if (!this.acceptingConnections) {
		// Not accepting requests at this time
		request.reject(404, "Not accepting connections.");
		return;
	}
	var websocket = request.accept(null, request.origin),
		connection = new WSConnection(lib.guid(), websocket);

	this._super(connection);
};

/**
 * Detects connection request origin
 * Returns true if the connection is coming from an accepted domain
 */
WSServer.originAllowed = function (origin) {
	return request.origin.match(this.origin);
};

// Event listeners

/**
 * Fired when the server receives a new HTTP request
 */
WSServer.onRequest = function (req, res) {
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
};

// Define the inheritance relationship
module.exports = Server.extend(WSServer);

