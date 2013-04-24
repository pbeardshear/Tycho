var lib = require('../lib'),
	Class = require('../class'),
	Server = require('../server'),
	TCPConnection = require('../connections/tcpconnection'),
	net = require('net'),
	TCPServer = {};

/**
 * Constructor
 *
 * @param {object} config - server configuration object.  See server.js for a list
 *		of accepted configuration parameters
 */
TCPServer.init = function (config) {
	this.server = net.createServer(this.onConnection.bind(this));

	this._super(config);
};

/**
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
 * Stop accepting new TCP connections to this server
 *
 * @param {bool} closeExistingConnections - immediately close all existing open connections
 *		by default, open connections are allowed to persist until closed naturally
 * @param {bool} shutdown - force close (end) all connections without waiting for a response
 */
TCPServer.close = function (closeExistingConnections, shutdown) {
	this.server.close(this.onClose.bind(this));
	if (closeExistingConnections) {
		// By default, server.close doesn't close existing connections
		lib.each(this.getConnections(), function (conn) {
			if (shutdown) {
				// Forces a TCP connection to end, and prevents any more I/O
				conn.destroy();
			}
			else {
				// Sends a TCP FIN packet to the client, requests an end to the connection
				conn.end();
			}
		});
	}

	this._super(shutdown);
};

/**
 * Accept a new socket connection and create a TCPConnection object to manage it
 *
 * @param {Net.Socket} socket - instance of raw node TCP socket object
 */
TCPServer.accept = function (socket) {
	if (!this.acceptingConnections) {
		socket.end();
		return;
	}
	var tcpConn = new TCPConnection(this, socket);
	this._super(tcpConn);
};

/**
 * True to allow a socket to complete connection to the server
 * Depends on the user supplied config acceptConnection function to perform validation
 *
 * @param {string} address - TCP connection object containing port and IP address fields
 */ 
TCPServer.allowConnection = function (address) {
	return this.acceptConnection && this.acceptConnection(address);
};

/**
 * Returns an iterator which retrieves each TCPConnection object
 * bound to this server
 */
TCPServer.getConnections = function () {
	return this.connections;
};


// Event Listeners
TCPServer.onConnection = function (socket) {
	this.fire('request');
	// The user may provide logic to prevent connections originating from
	// certain IP addresses or ports
	if (!this.allowConnection(socket.address())) {
		socket.end();
		return;
	}
	this.accept(socket);
};

// Define the inheritance hierarchy
module.exports = Server.extend(TCPServer);
