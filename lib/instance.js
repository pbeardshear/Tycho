//
//	instance.js
//

/*
 *
 *	Represents a contained instance of a game world
 *
 *	For some applications, this might be an individual game between a few players
 *	For more distributed "real-time" applications, each instance may represent an identical
 *	game world, when players are distributed to balance load
 *
 */
var Class = require('./class'),
	log = require('./log'),
	lib = require('./lib');

Instance =  Class({
	connections: {},
	binding: null,
	
	init: function (server, name) {
		this.binding = new server.binding.instance(name);
		this.binding.send = this.send.bind(this);
		this.binding.broadcast = this.broadcast.bind(this);
		
		this.server = server;
		this.name = name;
		
		log.out('Creating instance:', name);
		tycho.fireEvent('instance', 'create', this);
	},
	
	end: function () {
		// Close each of the connections in this instance
		lib.each(this.connections, function (conn) {
			conn.close();
		});
		this.connections = {};
		this.server = null;
		tycho.fireEvent('instance', 'end', this);
	},
	
	send: function () { },
	
	broadcast: function (message) {
		this.server.sockets.in(this.name).emit(message);
	},
	
	// Assumes responsibility for a connection
	handConnection: function (connection) {
		this.connections[connection.id] = connection;
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
});

module.exports = Instance;
