//
//	message.js
//

/*
 *
 *	Client message handling for spine.js
 *
 */

// namespace(spine) imported from spine.js
spine.Messages = (function () {
	var _events = {},
		_registeredNamespace = null;
	// Internal class for managing message which can be sent to the server using socket.io
	function SocketEvent (name, config) {
		this.name = name;
		this.init = config.init;
		this.validate = config.validate;
		this.serialize = config.serialize;
		this.callback = config.callback;
	}
	
	SocketEvent.prototype = {
		emit: function () {
			var _tempNamespace = {};
			// Initialize the event
			this.init.call(_tempNamespace)
			if (this.validate.call(_tempNamespace)) {
				spine._socket.emit('message', { type: this.name, data: this.serialize.call(_tempNamespace) }, (this.callback && this.callback.bind(_tempNamespace)) || undefined));
			}
		}
	};
	
	return {
		// Send a message up to the server.
		send: function (name) {
			if (_events[name]) {
				_events[name].emit();
			}
			else if (_registeredNamespace && _registeredNamespace[name]) {
				// User added a new message name after registering the namespace, let's initialize the message and send again
				this.create(name, _registeredNamespace[name]);
				this.send(name);
			}
			else {
				throw new Error("Unable to send message: " + name);
			}
		},
		
		// Create a new message, which is compatible with this.send
		create: function (name, config) {
			// Check for required fields
			if (!name) {
				throw new Error("Unable to create new spine.Message: name not provided.");
			}
			if (!(config.serialize && config.init)) {
				throw new Error("Unable to create new spine.Message: missing required field.");
			}
			
			// Initialize the message
			// Overwrite an existing message if one exists, or create a new message
			_events[name] = new SocketEvent(name, config);
		},
		
		// Register a message namespace for sending message, which allows you to add or remove different message types.
		register: function (namespace) {
			// Iterate over the namespace, and add each message in turn
			namespace.forEach(function (config, name) {
				this.create(name, config);
			}, this);
		}
	};
})();