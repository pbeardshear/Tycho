//
// connection.js
//

var implement = require('./implement'),
	evented = require('./event'),
	messages = require('./messages');

module.exports = Connection;

function Connection (server, ws) {
	implement(this, evented, ['broadcast', 'join', 'leave', 'close', 'message']);
	this.server = server;
	this.ws = ws;
	this.instance = null;
	this.paused = false;

	this.ws.on('message', this.onMessage);
	this.ws.on('close', this.onClose);
	this.server.on('pause', this.pause);

	// Reasons for dropping a connection
	// These are duplicated here for use by the developer
	this.reasonCodes = {
		normal: this.ws.CLOSE_REASON_NORMAL,
		goingAway: this.ws.CLOSE_REASON_GOING_AWAY,
		protocolError: this.ws.CLOSE_REASON_PROTOCOL_ERROR,
		unprocessable: this.ws.CLOSE_REASON_UNPROCESSABLE_INPUT,
		reserved: this.ws.CLOSE_REASON_RESERVED,
		abnormal: this.ws.CLOSE_REASON_ABNORMAL,
		invalidData: this.ws.CLOSE_REASON_INVALID_DATA,
		policyViolation: this.ws.CLOSE_REASON_POLICY_VIOLATION,
		messageSize: this.ws.CLOSE_REASON_MESSAGE_TOO_BIG,
		extensionRequired: this.ws.CLOSE_REASON_EXTENSION_REQUIRED
	};
}

/**
 * Send a message to the client
 * This supports both UTF-8 and binary encodings
 */
Connection.prototype.send = function (message) {
	if (!this.paused) {
		if (typeof message === 'object' && !Buffer.isBuffer(message)) {
			// JSON data
			message = JSON.stringify(message);
		}
		this.ws.send(message);	
	}
};

/**
 * If this message is in an instance, send a message
 * to all other connections in the instance
 */
Connection.prototype.broadcast = function (message) {
	this.fire('broadcast', this, message);
};

/**
 * Join an instance
 * {room} any user-defined object that groups connections together
 * internally, tycho will use an instance to manage the connections
 */
Connection.prototype.join = function (room) {
	this.fire('join', this, room);
};

/**
 * Leave a room
 * To completely disconnect from the server, see Connection.close
 */
Connection.prototype.leave = function() {
	this.fire('leave', this);
};

/**
 * Close down the connection
 * This is called if the connection is being terminated
 * on the server side.
 */
Connection.prototype.close = function () {
	// Close down the connection
	this.fire('close', this);
};

/**
 * Pause all incoming communication
 */
Connection.prototype.pause =  function () {
	this.paused = true;
};

/**
 * Terminate the connection
 * This closes a connection without waiting for a confirmation
 * from the host.  Should only be called if an error occurs.
 */
Connection.prototype.drop = function (description, reasonCode) {
	this.ws.drop(reasonCode || this.reasonCodes.normal, description);
	this.close();
};


/**
 * Handlers
 */
Connection.prototype.onMessage = function (message) {
	if (this.paused) {
		// Alert the client that the server is paused
		this.send(messages.connectionPaused);
		return;
	}
	// Accept message
	var payload;
	if (message.type === 'utf-8') {
		try {
			payload = JSON.parse(message.utf8Data);
		}
		catch (ex) {
			// Unable to parse data
			this.send(messages.invalidData);
			return;
		}
	}
	else if (message.type === 'binary') {
		// Convert from binary back to object
		try {
			if (Buffer.isBuffer(message.binaryData)) {
				payload = JSON.parse(message.binaryData.toString('utf8'));
			}
			else {
				// Something has gone horribly wrong...
				this.send(messages.malformedData);
				return;
			}
		}
		catch (ex) {
			// Unable to parse data
			this.send(messages.invalidData);
			return;
		}
	}
	// Call the appropriate handler
	this.fire(payload.type, payload.data);
};

/**
 * Connection was closed from the client side
 */
Connection.prototype.onClose = function(reasonCode, description) {
	this.close();
};