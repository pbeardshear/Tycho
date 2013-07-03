//
// connection.js
//

var messages = require('./messages'),
	Class = require('./class'),
	lib = require('./lib'),
	Q = require('q');
	Connection = {};


/**
 * Constructor
 */
Connection.init = function (processID, server) {
	this.id = lib.uid();
	// Connection address is of the form 'workerID:instanceID:connectionID'
	this.address = [processID, '', this.id].join(':');
	this.paused = false;
	this.channels = {};

	this.server = server;
	this.server.on('server:message', this.handleServerMessage.bind(this));
};

/**
 * @abstract
 * Send a message to the client
 */
Connection.send = function (message) { };

/**
 * Join an instance
 * {roomName} any user-defined object that groups connections together
 * internally, tycho will use an instance to manage the connections
 */
Connection.join = function (instanceID, channel) {
	this.channels[instanceID] = channel;
	this.updateAddress(instanceID, 1);
};

/**
 * Leave a room
 * To completely disconnect from the server, see Connection.close
 */
Connection.leave = function(instanceID) {
	var self = this;
	if (instanceID) {
		delete this.channels[instanceID];
		this.updateAddress('', 1);
	}
	else {
		// Leave all rooms
		lib.each(this.channels, function (channel) {
			channel.emit('connection:message', {
				type: 'leave',
				payload: {
					connection: self
				}
			});
		});
	}
};

/**
 * Close down the connection
 * This is called if the connection is being terminated
 * on the server side.
 */
Connection.close = function () {
	var self = this;
	this.leave();
	this.server.emit('connection:message', {
		type: 'close',
		payload: {
			connection: self
		}
	});
};

/**
 * Pause all incoming communication
 */
Connection.pause =  function () {
	this.paused = true;
};


/**
 * @private
 */
Connection.updateAddress = function (value, index) {
	var blocks = this.address.split(':');
	blocks[index] = value;
	this.address = blocks.join(':');
};

/**
 * @private
 * Returns the string representation of this connection's address
 */
Connection.getRawAddress = function () {
	return this.address;
};

/**
 * @private
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
 * @private
 * Returns the number of instances this connection is subscribed to
 */
Connection.getInstanceCount = function () {
	return lib.size(this.channels);
};

/**
 * @private
 */
Connection.handleServerMessage = function (message) {
	switch (message.type) {
		case 'close':
			this.close();
			break;
		case 'default':
			break;
	}
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

/**
 * @abstract
 */
Connection.onMessage = function (message) { };

/**
 * Connection was closed from the client side
 */
Connection.onClose = function(reasonCode, description) {
	this.close();
};

// Expose the Connection class
module.exports = Class.extend(Connection);
