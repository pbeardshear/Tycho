//
// connection.js
//

var implement = require('./implement'),
	evented = require('./event'),
	messages = require('./messages'),
	Class = require('./class'),
	lib = require('./lib'),
	Connection = {};


/**
 * Constructor
 */

Connection.init = function (processID) {
	implement(this, evented, ['broadcast', 'join', 'leave', 'close', 'message']);
	this.id = lib.uid();
	// Connection address is of the form 'workerID:instanceID:connectionID'
	this.address = [processID, '', this.id].join(':');
	this.instance = null;
	this.paused = false;
};

/**
 * Sets the connection's name property, to simplify piping
 * messages between two connections
 */
Connection.name = function (name) {
	// Update the connectionID portion of the id
	this.updateAddress(name, 2);
	this.name = name;
	this.fire('name', name);
};

/**
 * Sends a message from one connection to another
 */
Connection.pipe = function (connection, message) {
	if (Array.isArray(connection)) {
		connection.forEach(function (conn) {
			this.fire('pipe', conn, message);
		});		
	}
	else {
		this.fire('pipe', connection, message);	
	}
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
 * {roomName} any user-defined object that groups connections together
 * internally, tycho will use an instance to manage the connections
 */
Connection.join = function (roomName, success, failure) {
	// Leave a room, if we were previously in one
	this.leave();
	this.updateAddress(roomName, 1);
	this.fire('join', this, roomName, function (result) {
		if (result.success) {
			success && success();
		}
		else {
			failure && failure(result.error);
		}
	});
};

/**
 * Leave a room
 * To completely disconnect from the server, see Connection.close
 */
Connection.leave = function() {
	this.updateAddress('', 1);
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
 * @Private
 */
Connection.updateAddress = function (value, index) {
	var blocks = this.address.split(':');
	blocks[index] = value;
	this.address = blocks.join(':');
};

/**
 * Returns a formatted object representing this connection's address
 */
Connection.getAddress = function () {
	var address = this.address.split(':');
	return {
		workerID: address[0],
		instanceID: address[1],
		connectionID: address[2]
	};
};

/**
 * Handlers
 */

/**
 * Perform general validation before accepting and handling a message
 */
Connection.onBeforeMessage = function () {
	if (this.paused) {
		this.send(messages.connectionPaused);
		return false;
	}
	return true;
};

Connection.onMessage = function (message) {
	// This method should be implemented in extending classes
	return;
};

/**
 * Connection was closed from the client side
 */
Connection.onClose = function(reasonCode, description) {
	this.close();
};

// Expose the Connection class
module.exports = Class.extend(Connection);
