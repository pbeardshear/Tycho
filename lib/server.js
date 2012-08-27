//
//	server.js
//

/*
 *
 *	The server component of tycho.js.
 * 	One of the three main components of tycho.js, in addition to instance.js and connection.js
 *
 */
 
var http = require('http'),
	static = require('node-static'),
	utils = require('./utils'),
	io = require('socket.io');

Server = Class.extend({
	_connections: {},
	_instances: {},
	_instanceLRU: [],
	_maxInstances: 10,
	_namedInstances: false,
	_autocreateInstances: false,
	
	// Constructor
	init: function (namedInstances, autocreateInstances) {
		// Initialize the http server
		var fileServer = new static.Server();
		this._httpServer = http.createServer(function (request, response) {
			request.addListener('end', function () {
				fileServer.serve(request, response);
			});
		});
		
		// TODO: Register sockets on a namespace using .of(namespace)
		io.listen(this._httpServer).sockets.on('connection', this.registerConnection.bind(this));
		
		// Set up config values
		// TODO: Consider whether to allow namedInstances + autogenerate
		this._namedInstances = namedInstances;
		this._autocreateInstances = autocreateInstances;
		
		tycho.fireEvent('server', 'start', this);
	},
	
	listen: function (port) {
		this._port = port;
		this._httpServer.listen(port);
	},
	
	close: function () {
		this._httpServer.close();
		tycho.fireEvent('server', 'close', this);
	},
	
	end: function () {
		// Broadcast the close event to the instances on this server
		var instances = this._namedInstances ? this._instances : this._instanceLRU;
		_.each(instances, function (inst) {
			inst.end();
		});
		this.close();
	},
	
	// Alert the server to initialize a new instance
	registerInstance: function (name) {
		var inst = new Instance(this);
		if (this._namedInstances && name) {
			this._instances[name] = inst;
			
		}
		else {
			// We aren't using named instances, so instead we use the LRU array to manage the instances
			this._instanceLRU.unshift(inst);
		}
		tycho.fireEvent('server', 'instance', this, inst);
		return inst;
	},
	
	// There are two main events that happen on a connection -
	// When it is registered with the server,
	// and when it is handed to an instance to manage
	registerConnection: function (socket) {
		tycho.out.log('registering new connection');
		var connection = new Connection(socket);
		this._connections[socket.id] = connection;
		// Client sends a message
		socket.on('message', connection.onMessage.bind(connection));
		// Client disconnects
		socket.on('disconnect', connection.onDisconnect.bind(connection));
		
		if (this._autocreateInstances) {
			// Check if we have no instances, or if they are too full
			var instances = this._namedInstances ? this._instances : this._instanceLRU;
			if (utils.size(instances) == 0) {
				this.registerInstance(utils.guid());
			}
			// TODO: Implement load balancing
		}
		tycho.fireEvent('server', 'connection', this, connection);
		// TODO: This shouldn't always happen once the server gets a connection, right?
		this.handConnection(connection, utils.guid());
		tycho.out.log('end register connection');
	},
	
	// Pass a connection off to an instance
	handConnection: function (connection, name) {
		if (this._namedInstances && name) {
			this._instances[name].handConnection(connection);
		}
		else {
			// Choose an instance based on an LRU scheme
			this._instanceLRU[0].handConnection(connection);
			utils.moveBack(this._instanceLRU, 0);
		}
	},
	
	// This is called by an instance whenever one of its connections drops
	// This only matters if we aren't using named instances
	dropConnection: function (instance, connection) {
		delete this._connections[connection.id];
		if (!this._namedInstances) {
			// Find the instance in the array, and move it to the front
			for (var i = 0; i < this._instanceLRU.length; i++) {
				if (this._instanceLRU == instance) {
					utils.moveFront(this._instanceLRU, i);
					break;
				}
			}
		}
	}
});

module.exports = Server;
 
 
