//
//	tycho-client.js
//

/*
 *
 *	tycho.js companion client library for simplifying connections to 
 *	a tycho.js backend
 *	
 *	tycho-client is completely optional, and not required if you 
 *	just want to use the server-side tycho.js
 */

tycho = (function () {
	var self = {};
	
	return {
		// Bind handlers here for custom message handling
		onmessage: null,
		onconnect: null,
		ondisconnect: null,
		
		// Connect the client controller to the running tycho server
		connect: function (customHandler) {
			// Connect to the running tycho server
			// socket.io is required here
			if (io) {
				self.socket = io.connect();
				
				if (customHandler) {
					// User is using custom message handlers, bind those now
					self.socket.on('message', this.onmessage);
					self.socket.on('connect', this.onconnect);
					self.socket.on('disconnect', this.ondisconnect);
				}
				else {
					// tycho.js sends all messages through the 'message' header
					// Each message is identified by its type property
					self.socket.on('message', function (message) {
						// Message handler
						if (tycho.Messages) {
							tycho.Messages.receive(message);
						}
					});
					
					// Add default routes to handle internal server messages
					tycho.Messages.accept('connect');
					tycho.Messages.accept('ping');
					tycho.Messages.accept('disconnect');
				}
			}
			else {
				console.error('Could not find socket.io.  Please load the socket.io module before tycho.');
			}
		},
		
		// @Private
		// Send a message up to the server, using a consistent messaging interface
		send: function (name, data, callback) {
			self.socket.emit('message', { type: name, data: data }, callback);
		},
		
		// Namespace for useful methods
		util: {
			forEach: function (container, fn, scope) {
				// Fallback on native forEach if it exists
				if (Array.isArray(container) && Array.protoype.forEach) {
					Array.protoype.forEach.call(container, fn, scope);
				}
				else {
					for (var key in container) {
						if (container.hasOwnProperty(key)) {
							fn.call(scope || container, container[key], key);
						}
					}
				}
			},
			
			format: function (template) {
				var args = Array.prototype.slice.call(arguments, 1);
				for (var i = 0; i < args.length; i++) {
					template = template.replace('{'+i+'}', args[i]);
				}
				return template;
			}
		}
	};
})();
