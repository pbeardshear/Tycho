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
	if (!this.paused) {
		var payload = message;
		if (typeof message === 'object') {
			try {
				payload = JSON.stringify(message);
			}
			catch (err) {
				log.error('Unable to send message', message);
				return false;
			}
		}
		// TODO: consider bufferSizes and throttling
		var result = this.socket.write(payload);
		// result is true if the data was successfully written to the socket
		// false if part of the data is queued and waiting to be flushed	
	}
};

TCPConnection.drop = function () {
	this.socket.end();
};

// Event listeners

TCPConnection.onMessage = function (data) {
	if (!this.onBeforeMessage()) {
		return;
	}

	var payload = Buffer.isBuffer(data) ? data.toString() : data;
	// Try to parse the payload
	try {
		payload = JSON.parse(payload);
		if (payload.type && payload.data) {
			// Route the payload
			this.fire(payload.type, payload.data);
		}
		else {
			this.fire('message', payload);
		}
	}
	catch (err) {
		// Unable to parse the payload, just pass the whole thing over
		this.fire('message', payload);
	}
};

TCPConnection.onTimeout = function () {
	this.close();
};

TCPConnection.onError = function () {
	this.close();
};

module.exports = Connection.extend(TCPConnection);
