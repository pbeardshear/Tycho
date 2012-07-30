//
//	spine-client.js
//

/*
 *
 *	spine.js companion client library for simplifying connections to 
 *	a spine.js backend
 *	
 *	spine-client is completely optional, and not required if you 
 *	just want to use the server-side spine.js
 */

spine = (function () {
	
	return {
		init: function (port) {
			var self = this;
			// Connect to the running spine server
			// socket.io is required here
			if (io) {
				// TODO: Make this generic
				this._socket = io.connect('http://localhost:3000/');
				
				// spine.js send all messages through the 'message' header
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
				console.error('Could not find socket.io.  Please load the socket.io module before spine-client.');
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
				var args = Array.prototype.slice.call(arguments, 1);
				for (var i = 0; i < args.length; i++) {
					template = template.replace('{'+i+'}', args[i]);
				}
				return template;
			}
		}
	};
})();
