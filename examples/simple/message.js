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
	var self = {
		messages: {},
		handlers: {}
	};

	self.emit = function (name, message) {
		// Scope to hold properties between methods
		var bin = {};
		if (message.init) {
			message.init.call(bin);
		}
		if (!message.validate || message.validate.call(bin)) {
			tycho.send(name, message.serialize.call(bin), (message.callback && message.callback.bind(bin)));
		}
	};
	
	return {
		// Create a new message binding
		define: function (name, def) {
			var bindings = name;
			if (typeof name === 'string' && def) {
				bindings = {};
				bindings[name] = def;
			}
			tycho.util.forEach(bindings, function (msgDef, msgName) {
				if (!self.messages[msgName]) {
					self.messages[msgName] = msgDef;
				}
			});
		},
		
		// Send a message to the server
		// A message must be defined before it can be sent
		send: function (name) {
			if (self.messages[name]) {
				self.emit(name, self.messages[name]);
			}
		},
		
		// Bind a handler to a message from the server
		accept: function (name, handler) {
			if (!self.handlers[name]) {
				self.handlers[name] = [];
			}
			self.handlers[name].push(handler);
		},
		
		
		// @Private
		// Handle incoming message from server
		receive: function (message) {
			var name = message.type,
				handlers = self.handlers[name];
			if (handlers) {
				tycho.util.forEach(handlers, function (handler) {
					handler.call(message, message.data);
				});
			}
		}
	};
})();