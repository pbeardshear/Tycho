//
// connection.js
//

var messages = require('./messages'),
	Class = require('./class'),
	lib = require('./lib'),
	EventEmitter = require('events').EventEmitter,
	Connection = {};


/**
 * Constructor
 */
Connection.init = function (worker, channel) {
	this.id = lib.uid();
	this.address = lib.constructAddress(worker, this.id);
	this.flags = {};
	this.channel = channel;

	this.paused = false;
};

/**
 * @api
 * Prepare message, depending on currently set flags
 */
Connection.send = function (message) {
	if (this.flags.IN) {
		var room = this.flags.IN;
		this.channel.emit('connection:message', 'broadcast', this, room, message);
	}
	else if (this.flags.TO) {
		var to = this.flags.TO;
		this.channel.emit('connection:message', 'send', this, to, message);
	}
	else {
		this.dispatch(message);
	}
	this.clearFlags();
};

/**
 * @abstract
 * Send a message to the client
 */
Connection.dispatch = function (message) { };

/**
 * @api
 * Join an instance
 * {roomName} any user-defined object that groups connections together
 * internally, tycho will use an instance to manage the connections
 */
Connection.join = function (room, callback) {
	this.channel.emit('connection:message', 'join', this, room, callback);
};

/**
 * @api
 * Leave a room
 * To completely disconnect from the server, see Connection.close
 */
Connection.leave = function(room, callback) {
	this.channel.emit('connection:message', 'leave', this, room, callback);
};

/**
 * @api
 * Close down the connection
 * This is called if the connection is being terminated
 * on the server side.
 */
Connection.close = function () {
	this.paused = true;
	this.channel.emit('connection:message', 'close', this);
	this.emit('close', this);
};

/**
 * @api
 * Pause all incoming communication
 */
Connection.pause =  function () {
	this.paused = true;
};

Connection.in = function (room) {
	this.flags.ROOM = room;
	return this;
};

Connection.to = function (address) {
	this.flags.TO = address;
	return this;
};

Connection.get = function (key, callback) {
	this.channel.emit('connection:message', 'get', this, key, callback);
};

Connection.set = function (key, value, callback) {
	this.channel.emit('connection:message', 'set', this, key, value, callback);
};

/**
 * @private
 */
Connection.clearFlags = function () {
	this.flags = {};
};


/**
 * @private
 */
// Connection.updateAddress = function (value, index) {
// 	var blocks = this.address.split(':');
// 	blocks[index] = value;
// 	this.address = blocks.join(':');
// };

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
// Connection.getInstanceCount = function () {
// 	return lib.size(this.channels);
// };

/**
 * @private
 */
// Connection.handleServerMessage = function (message) {
// 	switch (message.type) {
// 		case 'close':
// 			this.close();
// 			break;
// 		case 'default':
// 			break;
// 	}
// };

/**
 * Handlers
 */

/**
 * Perform general validation before accepting and handling a message
 */
Connection.onBeforeMessage = function () {
	return !this.paused;
	// if (this.paused) {
	// 	this.send(messages.connectionPaused);
	// 	return false;
	// }
	// return true;
};

/**
 * @abstract; @api
 */
Connection.onMessage = function (message) {
	this.emit('message', message, this);
};

/**
 * @api
 * Connection was closed from the client side
 */
Connection.onClose = function(reasonCode, description) {
	this.close();
};

Connection.emit = EventEmitter.prototype.emit;

Connection.on = EventEmitter.prototype.on;

// Expose the Connection class
module.exports = Class.extend(Connection);
