//
// instance.js
//
// This is a purely internal class

var lib = require('./lib'),
	implement = require('./implement'),
	evented = require('./event'),
	Class = require('./class'),
	Instance = {};


/**
 * Constructor
 * {id} unique identifier for this Instance
 */
Instance.init = function (id) {
	// Instance implements evented interface
	implement(this, evented);
	this.id = id;
	this.connections = {};
}

/**
 * Manage a new connection
 * {connection} the connection to add
 */
Instance.addConnection = function (connection) {
	// We don't need to worry about handlers from different
	// instances being bound, since these events only allow one handler
	connection.on('close', this.onConnectionClose, this);
	connection.on('leave', this.onConnectionLeave, this);
	connection.on('broadcast', this.broadcast, this);
	connection.on('pipe', this.pipeMessage, this);

	connection.updateAddress(this.id, 1);
	this.connections[connection.id] = connection;

	this.fire('addconnection', this, connection);
};

/**
 * Remove a connection from this instance
 * {connection} the connection to remove
 */
Instance.dropConnection = function (connection) {
	connection.off('close', this.onConnectionClose);
	connection.off('leave', this.onConnectionJoin);
	connection.off('broadcast', this.broadcast);

	connection.updateAddress('', 1);
	delete this.connections[connection.id];
	this.fire('dropconnection', this, connection);
};

/**
 *
 */
Instance.pipeMessage = function (connectionID, message, source) {
	var deferred = Q.defer();
	// Lookup the connection by name
	var connection = this.findConnection(connectionID));
	if (connection) {
		connection.send(message);
		deferred.resolve();
	}
	else if (source) {
		this.fire('pipe', this, connectionID, message, source.getAddress());
		deferred.resolve();
	}
	else {
		deferred.reject();
	}
	return deferred.promise;
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
	this.fire('broadcast', this, connection, message);
};


/**
 * @param {String} name - name of the event to notify the connection of
 * @param {String} connectionID - id of connection to notify
 * @param {Array...} args - any additional arguments are passed with the event
 */
Instance.notifyConnection = function (name, connectionID) {
	var args = Array.prototype.slice.call(arguments, 2);
	if (connectionID in this.connections) {
		var connection = this.connections[connectionID];
		connection.fire.apply(connection, [name].concat(args));
	}
}

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
	this.fire('close', this.id);
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
Instance.onConnectionClose = function (connection) {
	// Request for connection close
	this.dropConnection(connection);
};

Instance.onConnectionLeave = function (connection) {
	// Request to leave this instance
	this.dropConnection(connection);
};

// Expose the Instance class
module.exports = Class.extend(Instance);
