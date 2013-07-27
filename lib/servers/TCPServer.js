var lib = require('../lib'),
	Class = require('../class'),
	Server = require('../server'),
	TCPConnection = require('../connections/tcpconnection'),
	net = require('net'),
	TCPServer = {};

/**
 * @override
 * Constructor
 *
 * @param {object} config - server configuration object.  See server.js for a list
 *		of accepted configuration parameters
 */
TCPServer.init = function (channel, manager, config) {
	this.server = net.createServer(this.onConnection.bind(this));

	this._super(channel, manager, config);
};

/**
 * @override
 * Start accepting connections on the given port and host IP
 *
 * @param {int} port - the port to listen on, defaults to random port
 * @param {string} [host] - the IP address to accept connections for, defaults to INADDRANY
 * @param {function} [callback] - function to be called when the server is ready to accept connections
 */
TCPServer.start = function (port, host) {
	// A port value of 0 will assign a random open port
	var defaultPort = 0;
	this.server.listen(this.port || defaultPort, host);
	this._super(this.port || defaultPort);
};

/**
 * @override
 * Stop accepting new TCP connections to this server
 *
 * @param {bool} shutdown - force close (end) all connections without waiting for a response
 */
TCPServer.close = function (shutdown) {
	this.server.close();

	this._super(shutdown);
};

/**
 * @override
 * Accept a new socket connection and create a TCPConnection object to manage it
 *
 * @param {Net.Socket} socket - instance of raw node TCP socket object
 */
TCPServer.accept = function (socket) {
	var tcpConn = new TCPConnection(this.processID, socket, this.manager);
	this._super(tcpConn);
};

TCPServer.reject = function (socket) {
	socket.end();
};

TCPServer.getType = function () {
	return 'tcp:server';
};

// Event Listeners
TCPServer.onConnection = function (socket) {
	var request = {
		type: 'tcp',
		address: socket.remoteAddress,
		port: socket.remotePort
	};
	this.verifyRequest(request, socket);
};

// Define the inheritance hierarchy
module.exports = Server.extend(TCPServer);
