//
//	connection.js
//

/*
 *
 *	Represents a socket.io connection to the client.
 *	In tycho.js, connections are usually encapsulated by a user class,
 *	(e.g. a Player, a User, etc.), which provides abstracted methods for
 *	the application to take advantage of.
 *
 *	One of the three main components of tycho.js, in addition to server.js and instance.js
 *
 */

Connection = Class({
	// Maintain a reference to the internal websocket
	instance: null,
	server: null,
	socket: null,
	binding: null,
	routes: null,
	
	init: function (server, ws) {
		this.binding = new server.binding.connection();
		this.binding.send = this.send;
		this.binding.broadcast = this.broadcast;
		
		this.id = ws.id;
		this.server = server;
		this.socket = ws;
		
		// Set socket properties that are useful on the client
		this.set('connected', true);
		this.set('id', this.id);
		
		log.out('Creating connection:', this.id);
		tycho.fireEvent('connection', 'create', this);
	},
	
	// Close down the connection
	close: function () {
		tycho.fireEvent('connection', 'close', this);
		this.socket.leave(this.instance.name);
		// Invalidate the connection
		this.id = null;
		this.socket = null;
		this.instance = null;
		this.server = null;
	},
	
	send: function (message, name) {
		log.out('sending message to connection:', this.id);
		if (typeof message === 'string') {
			// Send a simple string message
			this.socket.emit('message', { type: name, data: message });
		}
		else {
			var bin = {};
			message.init.call(bin);
			// Validate the submission
			if (!message.validate || message.validate.call(bin)) {
				this.socket.emit('message', { type: name, data: message.serialize.call(bin) }, message.callback || null);
			}
		}
	},
	
	broadcast: function (message) {
		this.socket.broadcast.to(this.instance).emit(message);
	},
	
	join: function (instance) {
		this.instance = instance;
		this.socket.join(this.instance.name);
	},
	
	// @Private
	onDisconnect: function () {
		tycho.fireEvent('connection', 'disconnect', this);
		this.set('connected', false);
		// Look for a disconnect route in our binding
		if (this.routes.disconnect) {
			this.routes.disconnect();
		}
		// TODO: We can't do this, since this.instance is only the instance name
		if (this.instance) {
			this.instance.dropConnection(this, true);
		}
		this.server.dropConnection(this);
		this.close();
	},
	
	onMessage: function (message) {
		tycho.fireEvent('connection', 'message', this, [message]);
		server.handleMessage(this, message);
	}
	
	// @Private
	set: function (name, value, callback) {
		this.socket.set(name, value, callback);
	},
	
	// @Private
	get: function (name, callback) {
		this.socket.get(name, function (err, value) {
			if (!err) {
				callback(value);
			}
		});
	}
});

module.exports = Connection;