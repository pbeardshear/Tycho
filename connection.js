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
		this._hasRouting = !!(this._internal && this._internal.Routes);
		
		// Initialize handlers that the internal class provides
		this.onDisconnect = (this._internal.onDisconnect || this._onDisconnect).bind(this);
		this.onMessage = (this._internal.onMessage || this._onMessage).bind(this);
		
		spine.out.log('creating connection');
		spine.out.log(this);
		this._socket = websocket;
	},
	
	send: function (message, name) {
		spine.out.log('sending message');
		spine.out.log(this);
		spine.out.log(this._onDisconnect);
		spine.out.log(this._socket);
		if (typeof message === 'string') {
			// Send a simple string message
			this._socket.emit('message', { type: name, data: message });
		}
		else {
			var tempNamespace = {};
			message.init.call(tempNamespace);
			// Validate the submission
			if (!message.validate || message.validate.call(tempNamespace)) {
				this._socket.emit('message', message.serialize.call(tempNamespace), message.callback || null);
			}
		}
	},
	
	// Default handlers for client side events
	// If the internal type does not define handlers for the connection,
	// then we check if it implements a routing namespace.
	// Otherwise, events are passed through to the instance.
	_onDisconnect: function () {
		if (this._hasRouting) {
			this._internal.Routes.disconnect.call(this._internal);
		}
		else {
			this.instance.onDisconnect(this);
		}
		// Tell the instance to drop this connection
		this.instance.dropConnection(this);
	},
	
	_onMessage: function (message) {
		spine.out.log('received message' + message);
		
		if (spine.routeToInstance) {
			this.instance.onMessage(this, message);
		}
		else {
			if (this._hasRouting) {
				if (this._internal.Routes[message.type]) {
					this._internal.Routes[message.type].call(this._internal, message);
				}
				// If the internal connection doesn't have the message, look for defaults
				else if (spine.Routes[message.type]) {
					spine.Routes[message.type].call(this, this._internal, message);
				}
			}
			else {
				// TODO: This should probably be on Server, not spine
				// Route directly to the server
				spine.out.log(this);
				spine.out.log(this._socket);
				spine.Routes[message.type].call(this, this._internal, message);
			}
		}
	}
	
});

module.exports = Connection;