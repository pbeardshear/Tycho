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
TCPServer.init = function (channel, config) {
	this.server = net.createServer(this.onConnection.bind(this));

	this._super(channel, config);
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
	console.log('==== STARTING SERVER');
	this.server.listen(this.port || defaultPort, host);
	this._super(this.port || defaultPort);
};

/**
 * @override
 * Stop accepting new TCP connections to this server
 *
 * @param {bool} closeExistingConnections - immediately close all existing open connections
 *		by default, open connections are allowed to persist until closed naturally
 * @param {bool} shutdown - force close (end) all connections without waiting for a response
 */
TCPServer.close = function (closeExistingConnections, shutdown) {
	this.server.close(this.onClose.bind(this));
	if (closeExistingConnections) {
		this.connections.emit('server:message', {
			type: 'close'
		})
	}

	this._super(shutdown);
};

/**
 * @override
 * Accept a new socket connection and create a TCPConnection object to manage it
 *
 * @param {Net.Socket} socket - instance of raw node TCP socket object
 */
TCPServer.accept = function (socket) {
	if (!this.acceptingConnections) {
		socket.end();
		return;
	}
	var tcpConn = new TCPConnection(this.processID, socket, this.connectionChannel);
	this._super(tcpConn);
};

/**
 * True to allow a socket to complete connection to the server
 * Depends on the user supplied config acceptConnection function to perform validation
 *
 * @param {string} address - TCP connection object containing port and IP address fields
 */ 
TCPServer.allowConnection = function (address) {
	return !this.originAllowed || this.originAllowed(address);
};


// Event Listeners
TCPServer.onConnection = function (socket) {
	this.channel.emit('server:message', {
		type: 'request',
		payload: {
			type: 'tcp',
			address: socket.address()
		}
	});
	// The user may provide logic to prevent connections originating from
	// certain IP addresses or ports
	if (!this.allowConnection(socket.address())) {
		console.log('==== GOT HERE');
		socket.end();
		return;
	}
	this.accept(socket);
};

// Define the inheritance hierarchy
module.exports = Server.extend(TCPServer);
