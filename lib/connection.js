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

Connection.init = function (processID, serverChannel) {
	this.id = lib.uid();
	// Connection address is of the form 'workerID:instanceID:connectionID'
	this.address = [processID, '', this.id].join(':');
	this.paused = false;
	this.channel = null;

	this.serverChannel = serverChannel;
};

/**
 * Sends a message from one connection to another
 * @param {Connection|Array<Connection>} connections - the connections to pipe the message to
 * @param {Object|String} message - message to send to the the given connections
 */
Connection.pipe = function (connections, message) {
	if (Array.isArray(connections)) {
		connections.forEach(function (conn) {
			// this.fire('pipe', conn, message, this);
			this.channel.emit('connection:message', {
				type: 'send',
				payload: {
					connection: this,
					to: conn,
					data: message
				}
			});
		});		
	}
	else {
		this.channel.emit('connection:message', {
			type: 'send',
			payload: {
				connection: this,
				to: connections,
				data: message
			}
		});
		// this.fire('pipe', connections, message, this);	
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
	// this.fire('broadcast', this, message);
	this.channel.emit('connection:message', {
		type: 'broadcast',
		payload: {
			connection: this,
			data: message
		}
	});
};

/**
 * [Deferred]
 * Join an instance
 * {roomName} any user-defined object that groups connections together
 * internally, tycho will use an instance to manage the connections
 */
Connection.join = function (roomName) {
	var deferred = Q.defer();
	// Leave a room, if we were previously in one
	this.leave();
	// this.fire('join', this, roomName, deferred);
	this.serverChannel.emit('connection:message', {
		type: 'join',
		payload: {
			connection: this,
			room: roomName,
			deferred: deferred
		}
	});
	return deferred.promise;
};

/**
 * Leave a room
 * To completely disconnect from the server, see Connection.close
 */
Connection.leave = function() {
	var self = this;
	lib.each([this.channel, this.serverChannel], function (channel) {
		channel.emit('connection:message', {
			type: 'leave',
			payload: {
				connection: self
			}
		});
	});
};

/**
 * Close down the connection
 * This is called if the connection is being terminated
 * on the server side.
 */
Connection.close = function () {
	var self = this;
	lib.each([this.channel, this.serverChannel], function (channel) {
		channel.emit('connection:message', {
			type: 'close',
			payload: {
				connection: self
			}
		});
	});
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

Connection.getRawAddress = function () {
	return this.address;
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

Connection.openInstanceChannel = function (channel) {
	this.channel = channel;
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
