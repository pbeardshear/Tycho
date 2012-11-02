//
// connection.js
//

var implement = require('implement'),
	evented = require('event');

module.exports = Connection;

function Connection (server, ws) {
	implement(this, evented, ['broadcast', 'join', 'leave', 'close', 'message']);
	this.server = server;
	this.ws = ws;
	this.instance = null;

	this.ws.on('message', this.onMessage);
	this.ws.on('close', this.onClose);
}

/**
 * Send a message to the client
 * This supports both UTF-8 and binary encodings
 */
Connection.prototype.send = function (message) {
	this.ws.send(message);
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
	this.onClose();
};

/**
 * Terminate the connection
 * This closes a connection without waiting for a confirmation
 * from the host.  Should only be called if an error occurs.
 */
Connection.prototype.drop = function (description) {
	// TODO: Support more drop codes
	this.ws.drop(ws.CLOSE_REASON_NORMAL, description);
	this.onClose();
};


/**
 * Handlers
 */
Connection.prototype.onMessage = function (message) {
	// Accept message
	var payload;
	if (message.type === 'utf-8') {
		// Convert data into object
		try {
			payload = JSON.parse(message.utf8Data);
		}
		catch (ex) {
			// Unable to parse data
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
			}
		}
		catch (ex) {
			// Unable to parse data
		}
	}
	// Call the appropriate handler
	this.fire(payload.type, payload.data);
};

/**
 * Connection was closed from the client side
 */
Connection.prototype.onClose = function(reasonCode, description) {
	this.fire('close', this);
};