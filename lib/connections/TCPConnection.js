var net = require('net'),
	Class = require('../class'),
	Connection = require('../connection'),
	TCPConnection = {};

/**
 * Constructor
 */
TCPConnection.init = function (server, socket) {
	this._super(server);
	this.socket = socket;

	// Received a packet from the sender
	this.socket.on('data', this.onMessage.bind(this));
	// The sender has closed this connection (FIN packet)
	this.socket.on('end', this.onClose.bind(this));
	// Socket connection has timed out
	this.socket.on('timeout', this.onTimeout.bind(this));
	// Server is requesting the connection be closed (sending FIN packet)
	this.socket.on('close', this.onClose.bind(this));

	this.socket.on('error', this.onError.bind(this));

	this.socket.setEncoding('utf8');
	// Disable the Nagle algorithm by default
	this.socket.setNoDelay(true);
};


TCPConnection.send = function (message) {
	// TODO: consider bufferSizes and throttling
	var result = this.socket.write(message);
	// result is true if the data was successfully written to the socket
	// false if part of the data is queued and waiting to be flushed
};

TCPConnection.drop = function () {
	this.socket.end();
};

// Event listeners

TCPConnection.onMessage = function (buffer) {
	this._super(buffer);
};

module.exports = Connection.extend(TCPConnection);
