//
// connection.js
//

var implement = require('./implement'),
	evented = require('./event'),
	messages = require('./messages'),
	Class = require('./class'),
	Connection = {};


/**
 * Constructor
 */

Connection.init = function (server) {
	implement(this, evented, ['broadcast', 'join', 'leave', 'close', 'message']);
	this.server = server;
	this.instance = null;
	this.paused = false;
};

/**
 * Send a message to the client
 * This supports both UTF-8 and binary encodings
 */
Connection.send = function (message) {
	// This method should be implemented in an extending subclass
	return;
};

/**
 * If this message is in an instance, send a message
 * to all other connections in the instance
 */
Connection.broadcast = function (message) {
	this.fire('broadcast', this, message);
};

/**
 * Join an instance
 * {room} any user-defined object that groups connections together
 * internally, tycho will use an instance to manage the connections
 */
Connection.join = function (room) {
	this.fire('join', this, room);
};

/**
 * Leave a room
 * To completely disconnect from the server, see Connection.close
 */
Connection.leave = function() {
	this.fire('leave', this);
};

/**
 * Close down the connection
 * This is called if the connection is being terminated
 * on the server side.
 */
Connection.close = function () {
	// Close down the connection
	this.fire('close', this);
};

/**
 * Pause all incoming communication
 */
Connection.pause =  function () {
	this.paused = true;
};


/**
 * Handlers
 */
Connection.onMessage = function (message) {
	if (this.paused) {
		// Alert the client that the server is paused
		this.send(messages.connectionPaused);
		return;
	}
	// Accept message
	var payload;
	if (message.type === 'utf8') {
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
Connection.onClose = function(reasonCode, description) {
	this.close();
};

// Expose the Connection class
module.exports = Class.extend(Connection);
