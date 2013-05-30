var dgram = require('dgram'),
	log = require('../log'),
	Class = require('../class'),
	Connection = require('../connection'),
	UDPConnection = {};

/**
 * Constructor
 */
UDPConnection.init = function (server, processID, rinfo) {
	this._super(processID);
	this.dest = rinfo;
	this.on('message', this.onMessage.bind(this));
	this.on('close', this.onClose.bind(this));

	// Since the connection is uniquely specified by a dest port/IP,
	// the socket we send data on can be long-lived
	this.socket = dgram.createSocket('udp6');
};

/**
 * Send a message to the associated destination address
 */
UDPConnection.send = function (message) {
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
		// Create a Buffer object out of the message string, with a default encoding of UTF-8
		var buffer = new Buffer(payload);
		// Open a new socket to send the message
		this.socket.send(buffer, 0, buffer.length, this.dest.port, this.dest.address);	
	}
};

/**
 * End the socket connection, without warning the client
 */
UDPConnection.drop = function () {
	this.socket.close();
};

/**
 * Event handlers
 */
UDPConnection.onMessage = function (buffer, rinfo) {
	if (!this.onBeforeMessage()) {
		return;
	}

	// Data object is assumed to be a node Buffer object
	var payload = buffer.toString();
	try {
		payload = JSON.parse(payload);
		if (payload.type && payload.data) {
			// Payload conforms to tycho's message format
			this.fire(payload.type, payload.data);
		}
		else {
			this.fire('message', payload);
		}
	}
	catch (err) {
		this.fire('message', payload);
	}
};

module.exports = Connection.extend(UDPConnection);
