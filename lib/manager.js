//
// manager.js
//
var lib = require('./lib');

/**
 * Constructor
 */
function Manager(store, channel) {
	this.store = store;
	this.store.on('message', this.handleStoreMessage.bind(this));
	this.channel = channel;

	this.flags = {};
	this.servers = {};
	this.connections = {};
	this.connectionCount = 0;

	channel.on('connection:message', this.handleConnectionMessage.bind(this));
	channel.on('server:message', this.handleServerMessage.bind(this));
}

Manager.prototype.room = function (room) {
	this.flags.ROOM = room;
	return this;
}

Manager.prototype.get = function (key, callback) {
	if (this.flags.ROOM) {
		var room = this.flags.ROOM + ':properties';
		this.store.get(room, key, callback);
	}
	else {
		// TODO: Allow getting of manager/tycho config values?
	}
	this.clearFlags();
};

Manager.prototype.set = function (key, value, callback) {
	if (this.flags.ROOM) {
		var room = this.flags.ROOM + ':properties';
		this.store.set(room, key, value, callback);
	}
	else {
		// TODO: Allow setting of manager/tycho config values?
	}
	this.clearFlags();
};

Manager.prototype.registerConnection = function (connection, type) {
	this.connections[connection.id] = connection;
	if (!this.servers[type]) {
		this.servers[type] = {};
	}
	this.servers[type][connection.id] = 1;
	this.connectionCount += 1;
};

Manager.prototype.removeConnection = function (connection) {
	delete this.connections[connection.id];
	for (var serverType in this.servers) {
		if (this.servers.hasOwnProperty(serverType)
		 && connection.id in this.servers[serverType]) {
			delete this.servers[serverType][connection.id];
		}
	}
	this.connectionCount -= 1;
};

Manager.prototype.getConnectionCount = function () {
	return this.connectionCount;
};


Manager.prototype.handleStoreMessage = function (type, payload, source) {
	switch (type) {
		case 'send':
			var address = payload.address,
				message = payload.message;
			if (address.connection in this.connections) {
				this.connections[address.connection].dispatch(message);
			}
			break;
		default:
			break;
	}
};

Manager.prototype.handleServerMessage = function (type) {
	var args = Array.prototype.slice.call(arguments, 1);
	switch (type) {
		case 'connect':
			var connection = args[0],
				server = args[1];
			this.registerConnection(connection, server);
			console.log('Firing connection event', connection);
			this.channel.emit('connect', connection);
			break;
		case 'request':
			var request = args[0],
				callback = args[1];
			if (!this.channel.emit('request', request, callback)) {
				callback(true);		// Allow all requests by default
			}
			break;
		case 'message':
			var connectionID = args[0];
			if (connectionID in this.connections) {
				var connection = this.connections[connectionID];
				connection.onMessage.apply(connection, args.splice(1));
			}
			break;
		case 'pause':
			var serverType = args[0];
			this.channel.emit('pause', serverType);
			break;
		case 'stop':
			var serverType = args[0];
			this.channel.emit('stop', serverType);
			break;
		case 'shutdown':
			var serverType = args[0],
				server = this.servers[serverType];
			for (var id in server) {
				if (server.hasOwnProperty(id)
				 && id in this.connections) {
					this.removeConnection(this.connections[id]);
					this.connections[id].close();
				}
			}
			this.servers[serverType] = {};
			break;
		default:
			break;
	}
};

Manager.prototype.handleConnectionMessage = function (type, connection) {
	var args = Array.prototype.slice.call(arguments, 2);
	switch (type) {
		case 'send':
			var to = args[0],
				address = lib.parseAddress(to);
			this.store.send('send', address.worker, {
				address: address,
				message: args[1]
			});
			break;
		case 'broadcast':
			var room = args[0];
			this.store.get(room+':connections', function (err, connections) {
				if (connections) {
					for (var conn in connections) {
						if (connections.hasOwnProperty(conn)) {
							var address = lib.parseAddress(connections[conn]);
							this.store.send('send', address.worker, {
								address: address,
								message: args[1]
							});
						}
					}
				}
			});
			break;
		case 'join':
			var room = args[0],
				callback = args[1],
				hash = connection.id + ':properties';
			this.store.multi()
				.hget(hash, 'max')
				.hlen(room+':connections')
				.exec(function (err, results) {
					if (results) {
						var max = results[0],
							count = results[1];
						if (count < max) {
							// TODO: Room delimeter should be something that can't be in a room name
							this.store.multi()
								.hset(room+':connections', connection.id, connection.address)
								.append(hash, 'rooms', ';;' + room)
								.exec(function (err, results) {
									callback(err, !!results);
								});
						}
						else {
							callback(err, false);
						}
					}
				});
			// this.store.get(hash, )
			// this.store.set(room+':connections', connection.id, connection.address, callback);
			break;
		case 'leave':
			var room = args[0],
				callback = args[1];
			this.store.del(room+':connections', connection.id, callback);
			break;
		case 'close':
			var hash = connection.id + ':properties';
			this.removeConnection(connection);
			this.store.get(hash, 'rooms', function (err, rooms) {
				if (rooms) {
					// TODO: Room delimiters
					rooms = rooms.split(';;');
					for (var i = 0; i < rooms.length; i++) {
						this.store.del(rooms[i]+':connections', connection.id);
					}
				}
			});
			break;
		case 'get':
			var hash = connection.id + ':properties',
				key = args[0],
				callback = args[1];
			this.store.get(hash, key, callback);
			break;
		case 'set':
			var hash = connection.id + ':properties',
				key = args[0],
				value = args[1],
				callback = args[2];
			this.store.set(hash, key, value, callback);
			break;
		default:
			break;
	}
};

Manager.prototype.clearFlags = function () {
	this.flags = {};
};

module.exports = Manager;