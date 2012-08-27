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
	
	return {
		init: function (port) {
			var self = this;
			// Connect to the running tycho server
			// socket.io is required here
			if (io) {
				// TODO: Make this generic
				this._socket = io.connect('http://localhost:3000/');
				
				// tycho.js send all messages through the 'message' header
				// Each message is identified by its type property
				this._socket.on('message', function (message) {
					// Message handler
					if (self.Messages) {
						self.Messages.receive(message);
					}
					// TODO: Handle not using the default messages library
				});
			}
			else {
				console.error('Could not find socket.io.  Please load the socket.io module before tycho-client.');
			}
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
				var args = Array.prototype.slice.call(arguments, 1),
					regex;
				for (var i = 0; i < args.length; i++) {
					regex = new RegExp('{['+i+']}', 'g');
					template = template.replace(regex, args[i]);
				}
				return template;
			}
		}
	};
})();
