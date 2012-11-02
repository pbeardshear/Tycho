//
// instance.js
//
// This is a purely internal class

var lib = require('../lib');

module.exports = Instance;

/**
 * Constructor
 * {id} unique identifier for this Instance
 */
function Instance(id) {
	// Instance implements evented interface
	implement(this, evented);
	this.id = id;
	this.connections = {};
}
/**
 * Manage a new connection
 * {connection} the connection to add
 */
Instance.prototype.addConnection = function (connection) {
	// We don't need to worry about handlers from different
	// instances being bound, since these events only allow one handler
	connection.on('close', this.onConnectionClose, this);
	connection.on('leave', this.onConnectionLeave, this);
	connection.on('broadcast', this.broadcast, this);

	this.connections[connection.id] = connection;
};

/**
 * Remove a connection from this instance
 * {connection} the connection to remove
 */
Instance.prototype.dropConnection = function (connection) {
	connection.off('close', this.onConnectionClose);
	connection.off('leave', this.onConnectionJoin);
	connection.off('broadcast', this.broadcast);

	delete this.connections[connection.id];
};


/**
 * {connection} the connection that initiated the broadcast
 * it will not be sent the message
 * {message} the message to send
 */
Instance.prototype.broadcast = function (connection, message) {
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
Instance.prototype.close = function (disconnect) {
	lib.each(this.connections, function (conn) {
		conn.leave(this);
		if (disconnect) {
			conn.close();
		}
	});
};


/**
 * Event handlers
 */
Instance.prototype.onConnectionClose = function (connection) {
	// Request for connection close
	this.dropConnection(connection);
};

Instance.prototype.onConnectionLeave = function (connection) {
	// Request to leave this instance
	this.dropConnection(connection);
};
