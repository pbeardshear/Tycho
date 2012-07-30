//
//	instance.js
//

/*
 *
 *	Represents a contained instance of a game world
 *
 *	For some applications, this might be an individual game between a few players
 *	For more distributed "real-time" applications, each instance may represent an identical
 *	game world, when players are distributed to balance load
 *
 */
 
Instance =  Class.extend({
	_connections: {},
	// Represents an instance of the application specific internal type which connection will wrap
	_internal: null,
	
	init: function (server, name) {
		// Create an instance of the internal type
		this._internal = new spine.instanceType(server, name);
		this._internal.broadcast = this.broadcast;
		this._internal.send = this.send;
		this._hasRouting = !!this._internal.Routes;
		
		// Hook into the event handlers that the instance class exposes
		this.onConnect = (this._internal.onConnect || this._onConnect).bind(this._internal);
		this.onDisconnect = (this._internal.onDisconnect || this._onDisconnect).bind(this._internal);
		this.onMessage = (this._internal.onMessage || this._onMessage).bind(this._internal);
		
		// Initialize the connection
		this._server = server;
	},
	
	// Broadcast a message to all connections in this instance
	broadcast: function (message) {
		_.each(this._connections, function (connection) {
			connection.send(message);
		});
	},
	
	// Pipe a message from one connection to another
	send: function (message, identifier) {
		// The identifier can either be a connection id or an internalType id
		// TODO: Consider the easiest way for connections to identify each other
		// var connection = this._connections[identifier] || this._connections
	},
	
	// Called by the server when a connection is ready to be managed by this instance
	// Once the connection has passed to the instance, all communication between the
	// client and server will pass through the instance
	handConnection: function (connection) {
		this._connections[connection.id] = connection;
		connection.instance = this;
	},
	
	dropConnection: function (connection) {
		delete this._connections[connection.id];
		// Bubble this event up to the server
		this._server.dropConnection(this, connection);
	},
	
	// Empty handlers if the user did not provide event hooks for the instance
	_onConnect: function () { },
	_onDisconnect: function () { },
	_onMessage: function (connection, message) {
		if (this._hasRouting) {
			if (this._internal.Routes[message.type]) {
				this._internal.Routes[message.type].call(this._internal, connection._internal, message);
			}
			else if (spine.Routes[message.type]) {
				spine.Routes[message.type].call(this, this._internal, connection._internal, message);
			}
		}
	}
});

module.exports = Instance;
