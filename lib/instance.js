//
//	instance.js
//

var log = require('./log'),
	lib = require('./lib');

module.exports = Instance = (function () {
	//	Private constructor
	// ----------------------------------------------------------------------------------------------------------------
	var self = function (server, name) {
		this.binding = new server.binding.instance(name);
		// Back reference
		this.binding.__internal = this;
		lib.apply(this.binding, lib.bindAll(public, this));
		
		this.server = server;
		this.name = name;
		this.connections = {};
		this.connectionBindings = {};
		
		log.out('Creating instance:', name);
		tycho.fireEvent('instance', 'create', this);
	};
	
	//	Private methods
	// ----------------------------------------------------------------------------------------------------------------
	self.prototype = {
		end: function () {
			// Close each of the connections in this instance
			lib.each(this.connections, function (conn) {
				conn.close();
			});
			this.connections = {};
			this.server = null;
			this.binding = null;
			tycho.fireEvent('instance', 'end', this);
		},
		
		send: function (connection, name, payload, callback) {
			connection.send(name, payload);
		},
		
		broadcast: function (name, payload, callback) {
			if (payload) {
				this.server.sockets.in(this.name).emit(name, payload, callback);
			}
			else {
				this.server.messages.send(name, this.broadcast);
			}
		},
		
		// Assumes responsibility for a connection
		handConnection: function (connection) {
			this.connections[connection.id] = connection;
			this.connectionBindings[connection.binding.id || connection.id] = connection.binding;
			connection.set('instance', this.name);
			connection.join(this);
		},
		
		dropConnection: function (connection, bubbleToServer) {
			if (bubbleToServer || !this.server.allowReconnect) {
				connection.set('instance', null);
			}
			delete this.connections[connection.id];
			if (bubbleToServer) {
				this.server.dropConnection(connection);
			}
		}
	};
	
	//	Public interface for bound classes
	// ----------------------------------------------------------------------------------------------------------------
	var public = {
		send: function (id, name, message, callback) {
			if (this.connectionBindings[id]) {
				this.send(this.connectionBindings[id].__internal, name, message, callback);
			}
		},
		
		broadcast: function (name, message, callback) {
			this.broadcast(name, message, callback);
		},
		
		// Add a connection to this instance
		join: function (connection) {
			this.server.handConnection(connection.__internal, this.name);
		},
		
		leave: function (connection) {
			if (connection.__internal.instance === this) {
				connection.__internal.leave();
			}
		}
	};

	return self;
})();