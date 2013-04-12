var Class = require('../class'),
	Server = require('../server'),
	WebSocketServer = require('websocket').server,
	WSServer = {};


/**
 * Constructor
 */
WSServer.init = function (config) {
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

	this._super(config);
};

/**
 * Binds the websocket request handler and starts the HTTP server
 * @param {int} port - port number to begin listening for connections on.
 *		If no port number is passed, the server will listen on a random port
 * @param {string} [host] - optional IP address to listen for connections on
 */
WSServer.start = function (port, host) {
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
	this.httpServer.listen(this.port);

	this._super(port, host);
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

// Define the inheritance relationship
module.exports = Server.extend(WSServer);

