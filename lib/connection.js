//
//	connection.js
//

var log = require('./log'),
	lib = require('./lib');

module.exports = Connection = (function () {
	//	Private constructor
	// ----------------------------------------------------------------------------------------------------------------
	var self = function (server, ws) {
		this.id = ws.id;
		this.binding = new server.binding.connection(this.id);
		// Back reference
		this.binding.__internal = this;
		lib.apply(this.binding, lib.bindAll(public, this));
		
		this.server = server;
		this.socket = ws;
		this.instance = null;
		this.routes = null;
		
		// Set socket properties that are useful on the client
		this.set('connected', true);
		this.set('id', this.id);
		
		log.out('Creating connection:', this.id);
		tycho.fireEvent('connection', 'create', this);
	};
	
	//	Private methods
	// ----------------------------------------------------------------------------------------------------------------
	self.prototype = {
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
			this.binding = null;
		},
		
		send: function (name, payload, callback) {
			log.out('sending message to connection:', this.id);
			if (payload) {
				this.socket.emit('message', { type: name, data: payload }, callback);
			}
			else {
				// Send out via the attached messaging system
				this.server.messages.send(name, this.send);
			}
		},
		
		broadcast: function (name, payload, callback) {
			if (payload) {
				this.socket.broadcast.to(this.instance.name).emit('message', { type: name, data: payload }, callback);
			}
			else {
				this.server.messages.send(name, this.broadcast);
			}
		},
		
		join: function (instance) {
			this.instance = instance;
			this.socket.join(this.instance.name);
		},
		
		leave: function () {
			if (this.instance) {
				this.socket.leave(this.instance.name);
				this.instance.dropConnection(this, false);
				this.instance = null;
			}
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
	};
	
	//	Public interface for bound classes
	// ----------------------------------------------------------------------------------------------------------------
	var public = {
		send: function (name, message, callback) {
			this.send(name, message, callback);
		},
		
		broadcast: function (name, message, callback) {
			this.broadcast(name, message, callback);
		},
		
		join: function (instance) {
			this.server.handConnection(this, instance.__internal.name);
		},
		
		leave: function () {
			this.leave();
		}
	};

	return self;
})();