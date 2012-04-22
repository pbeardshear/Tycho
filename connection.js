//
//	connection.js
//

/*
 *
 *	Represents a socket.io connection to the client.
 *	In spine.js, connections are usually encapsulated by a user class,
 *	(e.g. a Player, a User, etc.), which provides abstracted methods for
 *	the application to take advantage of.
 *
 *	One of the three main components of spine.js, in addition to server.js and instance.js
 *
 */
 
var _ = require('underscore'),
	spine = require('./spine'),
	Server = require('./server'),
	Instance = require('./instance'),
	Class = require('./Class');

Connection = Class.extend({
	// Maintain a reference to the internal websocket
	_socket: null,
	_internal: null,
	_hasRouting: false,
	
	// Set by the instance when the server hands over control of this connection
	instance: null,
	
	init: function (websocket) {
		this._internal = new spine.connectionType();
		// Add hooks into the internal object that give access to connection methods
		this._internal.send = this.send;
		
		// Initialize connection
		this.id = websocket.id;
		this._hasRouting = !!this._internal.Messages;
		
		// Initialize handlers that the internal class provides
		this.onDisconnect = (this._internal.onDisconnect || this._onDisconnect).bind(this);
		this.onMessage = (this._internal.onMessage || this._onMessage).bind(this);
		
		this._socket = websocket;
	},
	
	send: function (message) {
		var tempNamespace = {};
		message.init.call(tempNamespace);
		// Validate the submission
		if (!message.validate || message.validate.call(tempNamespace)) {
			this._socket.emit('message', message.serialize.call(tempNamespace), message.callback || null);
		}
	},
	
	// Default handlers for client side events
	// If the internal type does not define handlers for the connection,
	// then we check if it implements a routing namespace.
	// Otherwise, events are passed through to the instance.
	_onDisconnect: function () {
		if (this._hasRouting) {
			this._internal.Messages.disconnect.call(this._internal);
		}
		else {
			this.instance.onDisconnect(this);
		}
		// Tell the instance to drop this connection
		this.instance.dropConnection(this);
	},
	
	_onMessage: function (message) {
		if (!spine.routeToInstance && this._hasRouting) {
			this._internal.Messages[message.type].call(this._internal, message);
		}
		else {
			this.instance.onMessage(this, message);
		}
	}
	
});

module.exports = Connection;