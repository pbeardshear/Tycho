//
// instance.js
//
// This is a purely internal class

/*
 * TODO: allow servers of different types to share connections in instances
 * i.e. allow instance to be managed by many servers
 */

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
	this.namedConnections = {};
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
	connection.on('name', this.nameConnection, this);

	this.connections[connection.id] = connection;
	this.fire('add-connection', connection);
};

/**
 * Remove a connection from this instance
 * {connection} the connection to remove
 */
Instance.dropConnection = function (connection) {
	connection.off('close', this.onConnectionClose);
	connection.off('leave', this.onConnectionJoin);
	connection.off('broadcast', this.broadcast);

	delete this.connections[connection.id];
};

/**
 *
 */
Instance.pipeMessage = function (connectionName, message) {
	// Lookup the connection by name
	var connection = (typeof connectionName === 'object' ? connectionName : this.findConnection(connectionName));
	if (connection) {
		connection.send(message);
	}
	else {
		this.fire('pipe', this, connection, message);
	}
}


/**
 * {connection} the connection that initiated the broadcast
 * it will not be sent the message
 * {message} the message to send
 */
Instance.broadcast = function (connection, message) {
	// Send a message to all connections
	lib.each(this.connections, function (conn) {
		if (conn.id !== connection.id) {
			conn.send(message);	
		}
	})
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
};

/**
 * Finds a connection based on its user given name
 */
Instance.findConnection = function (connectionName) {
	return this.namedConnections[connectionName] || null;
}

/**
 * Event handlers
 */
Instance.nameConnection = function (name, connection) {
	this.namedConnections[name] = connection;
};

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
