//
//	message.js
//

/*
 *
 *	Client message handling for tycho.js
 *
 */

// namespace(tycho) imported from tycho-client.js
// If you are not using the tycho client library, then Messages will
// be bound to the global namespace
//
// TODO: Remove all dependencies on tycho-client
(this.tycho || this).Messages = (function () {
	var _events = {},
		_receivers = {},
		_registeredNamespace = null;
	// Internal class for managing messages which can be sent to the server using socket.io
	function SocketEvent (name, config) {
		this.name = name;
		this.init = config.init;
		this.validate = config.validate;
		this.serialize = config.serialize;
		this.callback = config.callback;
	}
	
	SocketEvent.prototype = {
		emit: function (callback) {
			var _tempNamespace = {};
			// Initialize the event
			if (this.init) {
				this.init.call(_tempNamespace);
			}
			if (!this.validate || this.validate.call(_tempNamespace)) {
				tycho._socket.emit('message', 
					{ type: this.name, data: this.serialize.call(_tempNamespace) },
					this.handleResponse.bind(this, callback, _tempNamespace));
			}
		},
		
		handleResponse: function (callback, namespace) {
			// Call any user-specified callback that was passed when we sent the message
			if (callback) {
				callback.call(namespace);
			}
			// If any callback was bound to the definition of this message,
			// then call that now
			if (this.callback) {
				this.callback.call(namespace);
			}
		}
	};
	
	return {
		// TODO: Consider a shortcut method for binding update messages
		// i.e., messages in which the client is simply sending state up
		// to the server to update on the other connected clients
	
		// Send a message up to the server.
		send: function (name, callback) {
			if (_events[name]) {
				_events[name].emit(callback);
			}
			else if (_registeredNamespace && _registeredNamespace[name]) {
				// User added a new message name after registering the namespace, let's initialize the message and send again
				this.create(name, _registeredNamespace[name]);
				this.send(name, callback);
			}
			else {
				throw new Error("Unable to send message: " + name);
			}
		},
		
		// Create a new message, which is compatible with this.send
		create: function (name, config) {
			// Check for required fields
			if (!name) {
				throw new Error("Unable to create new tycho.Message: name not provided.");
			}
			if (!config.serialize) {
				throw new Error("Unable to create new tycho.Message: missing required field (serialize).");
			}
			
			// Initialize the message
			// Overwrite an existing message if one exists, or create a new message
			_events[name] = new SocketEvent(name, config);
		},
		
		// Register a message namespace for sending message, which allows you to add or remove different message types.
		register: function (namespace) {
			// Iterate over the namespace,  and add each message in turn
			tycho.util.forEach(namespace, function (config, name) {
				this.create(name, config);
			}, this);
		},
		
		// Tell tycho what message types you will accept from the server
		acceptMessages: function (messages) {
			tycho.util.forEach(messages, function (callback, name) {
				// TODO: May want to wrap additional structure around callback,
				// or provide additional functionality to hook into if useful
				_receivers[name] = callback;
			});
		},
		
		receive: function (message) {
			// We received a message, check if a corresponding receiver exists to handle it
			if (_receivers[message.type]) {
				_receivers[message.type](message);
			}
		}
	};
})();