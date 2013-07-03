//
// instance.js
//
// This is a purely internal class

var lib = require('./lib'),
	EventEmitter = require('events').EventEmitter,
	Class = require('./class'),
	Instance = {};


/**
 * Constructor
 * {id} unique identifier for this Instance
 */
Instance.init = function (id, channel) {
	this.id = id;
	this.connections = {};

	this.channel = channel;
	
	this.connectionChannel = new EventEmitter();
	this.connectionChannel.on('connection:message',
		this.handleConnectionMessage.bind(this));
}

/**
 * Manage a new connection
 * {connection} the connection to add
 */
Instance.addConnection = function (connection) {
	connection.join(this.id, this.channel);
	this.connections[connection.id] = connection;

	this.channel.emit('instance:message', {
		type: 'addconnection',
		payload: {
			instance: this,
			connection: connection
		}
	});
};

/**
 * Remove a connection from this instance
 * {connection} the connection to remove
 */
Instance.dropConnection = function (connection, bubble) {
	connection.leave();
	delete this.connections[connection.id];

	if (bubble) {
		this.channel.emit('instance:message', {
			type: 'dropconnection',
			payload: {
				instance: this,
				connection: connection
			}
		});
	}
};

/**
 * Send a message to the specified connection
 */
Instance.send = function (connectionID, message) {
	var connection = this.findConnection(connectionID);
	if (connection) {
		connection.send(message);
	}
}


/**
 * @param {Connection} connection - the connection that initiated
 * 		the broadcast.  it will not be sent the message.  if null is passed,
 *		we assume that all connections should receive the message
 * @param {Object|String} message - the message to send
 */
Instance.broadcast = function (connection, message) {
	// Send a message to all connections
	lib.each(this.connections, function (conn) {
		if (!connection || (conn.id !== connection.id)) {
			conn.send(message);
		}
	});
};

/**
 * Shut down this instance
 * {disconnect} true to send a disconnect message to all connections
 * connections that are not disconnected are 
 */
Instance.close = function (disconnect) {
	lib.each(this.connections, function (conn) {
		conn.leave(this);
		if (disconnect) {
			conn.close();
		}
	});
	this.channel.emit('instance:message', {
		type: 'close',
		payload: {
			instance: this
		}
	});
};

/**
 * Finds a connection based on its user given name
 * @param {String|Address} address - connection id or address parameter
 */
Instance.findConnection = function (address) {
	var connectionID = address.connectionID || address;
	return this.connections[connectionID] || null;
}

/**
 * Event handlers
 */
Instance.handleConnectionMessage = function (message) {
	console.log('RECEIVED CONNECTION MESSAGE');
	var connection = message.payload.connection;
	switch (message.type) {
		case 'leave':
			this.dropConnection(connection, true);
			break;
		case 'close':
			this.dropConnection(connection, true);
			break;
		default:
			console.log('--- Bubbling event...');
			// Bubble message
			message.payload.instance = this;
			this.channel.emit('instance:message', message);
			break;
	}
};

// Expose the Instance class
module.exports = Class.extend(Instance);
