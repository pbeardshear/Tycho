var lib = require('../lib'),
	Class = require('../class'),
	Server = require('../server'),
	UDPConnection = require('../connections/udpconnection'),
	udp = require('dgram'),
	UDPServer = {};

/**
 * @override
 * Constructor
 *
 * UDP is quite a bit different in functionality compared to TCP and WebSockets
 * The main point of difference is that UDP has no concept of a 'connection' per se,
 * As no handshake occurs prior to data being received.
 *
 * To unify the API as much as possible, the UDPConnection object creates a virtual
 * connection for UDP packets based on source IP/port.  However, note that there
 * may not be equivalent functionality supported in UDPConnections as compared
 * to TCPConnections.
 */
UDPServer.init = function (channel, manager, config) {
	this.socket = udp.createSocket('udp6');
	this.connections = {};

	this._super(channel, manager, config);
};

/**
 * @override
 * Listen for datagram packets on the specified port and host IP
 */
UDPServer.start = function (port, host) {
	// A port value of 0 will assign a random open port
	var defaultPort = 0;
	this.socket.on('message', this.onMessage.bind(this));

	this.socket.bind(this.port || defaultPort, host);
	this._super(this.port || defaultPort);
};

/**
 * @override
 * Stop accepting connections to this server
 */
UDPServer.close = function (shutdown) {
	this.socket.close();
	this._super(shutdown);
};

UDPServer.accept = function (connID) {
	var connection = new UDPConnection(this.processID, connID, this.manager);
	this.connections[connID] = connection.id;
	this._super(connection);
};

UDPServer.getType = function () {
	return 'udp:server';
};

// Event listeners
UDPServer.onMessage = function (buffer, rinfo) {
	// Try to match the sender address to an existing connection
	var connID = rinfo.address + '|' + rinfo.port;
	if (connID in this.connections) {
		// Forward the message on to the connection
		this.manager.emit('server:message', 'message', this.connections[connID], buffer, rinfo);
	}
	else {
		var request = {
			type: 'udp',
			address: rinfo.address,
			port: rinfo.port
		};
		this.verifyRequest(request, connID);
	}
};


// Define the inheritance hierarchy
module.exports = Server.extend(UDPServer);

