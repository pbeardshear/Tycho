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
var Class = require('./class'),
	log = require('./log'),
	lib = require('./lib');

Connection = Class({
	// Maintain a reference to the internal websocket
	instance: null,
	server: null,
	socket: null,
	binding: null,
	routes: null,
	
	init: function (server, ws) {
		this.binding = new server.binding.connection();
		this.binding.send = this.send.bind(this);
		this.binding.broadcast = this.broadcast.bind(this);
		
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
		if (this.instance) {
			this.socket.leave(this.instance.name);
		}
		// Invalidate the connection
		this.id = null;
		this.socket = null;
		this.instance = null;
		this.server = null;
	},
	
	send: function (name, message, callback) {
		log.out('sending message to connection:', this.id);
		if (message) {
			// Send a simple string message
			this.socket.emit('message', { type: name, data: message }, callback);
		}
		else {
			// Send out via the attached messaging system
			this.server.messages.send(name, this);
		}
	},
	
	broadcast: function (message) {
		this.socket.broadcast.to(this.instance.name).emit(message);
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
		if (this.instance) {
			this.instance.dropConnection(this, true);
		}
		this.server.dropConnection(this);
		this.close();
	},
	
	onMessage: function (message) {
		tycho.fireEvent('connection', 'message', this, [message]);
		this.server.handleMessage(this, message);
	},
	
	// @Private
	set: function (name, value, callback) {
		// Set the value on the websocket, so it is available to the client
		this.socket.set(name, value, callback);
		// Set the value on this connection
		this[name] = value;
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