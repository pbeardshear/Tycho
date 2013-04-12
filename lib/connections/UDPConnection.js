var dgram = require('dgram'),
	Class = require('../class'),
	Connection = require('../connection'),
	UDPConnection = {};

/**
 * Constructor
 */
UDPConnection.init = function (server, rinfo) {
	this._super(server);
	this.dest = rinfo;
	this.on('message', this.onMessage.bind(this));

	// Since the connection is uniquely specified by a dest port/IP,
	// the socket we send data on can be long-lived
	this.socket = dgram.createSocket('udp6');
};

/**
 * Send a message to the associated destination address
 */
UDPConnection.send = function (message) {
	var buffer = new Buffer(message);
	// Open a new socket to send the message
	this.socket.send(buffer, 0, buffer.length, this.dest.port, this.dest.address);
};

/**
 * End the socket connection, without warning the client
 */
UDPConnection.drop = function () {
	this.socket.close();
};

// Event listeners
UDPConnection.onMessage = function (buffer) {
	this._super(buffer);
};

module.exports = Connection.extend(UDPConnection);
