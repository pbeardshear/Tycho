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
		connect: function (useCustomHandler) {
			// Connect to the running tycho server
			// socket.io is required here
			if (io) {
				self.socket = io.connect('/tycho');
				
				if (useCustomHandler) {
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
						if (tycho.messages) {
							tycho.messages.receive(message);
						}
					});
					
					// Add default routes to handle internal server messages
					tycho.messages.accept('connect');
					tycho.messages.accept('ping');
					tycho.messages.accept('disconnect');
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
		}
	};
})();
