//
//	server.js
//

/*
 *
 *	The server component of spine.js.
 * 	One of the three main components of spine.js, in addition to instance.js and connection.js
 *
 */
 
var _ = require('underscore'),
	http = require('http'),
	static = require('node-static'),
	io = require('socket.io'),
	utils = require('./utils'),
	Class = require('./class'),
	Instance = require('./instance'),
	Connection = require('./connection');

	
Server = Class.extend({
	_connections: {},
	_instances: {},
	_instanceLRU: [],
	_maxInstances: 10,
	_namedInstances: false,
	
	// Constructor
	init: function () {
		// Initialize the http server
		var fileServer = new static.Server();
		this._httpServer = http.createServer(function (request, response) {
			request.addListener('end', function () {
				fileServer.serve(request, response);
			});
		});
		
		// TODO: Register sockets on a namespace using .of(namespace)
		io.listen(this._httpServer).sockets.on('connection', this.registerConnection.bind(this));
	},
	
	listen: function (port) {
		this._port = port;
		this._httpServer.listen(port);
	},
	
	// Alert the server to initialize a new instance
	registerInstance: function (name) {
		if (this._namedInstances && name) {
			this._instances[name] = new Instance(this);
		}
		else {
			// We aren't using named instances, so instead we use the LRU array to manage the instances
			this._instanceLRU.unshift(new Instance(this));
		}
	},
	
	// There are two main events that happen on a connection -
	// When it is registered with the server,
	// and when it is handed to an instance to manage
	registerConnection: function (socket) {
		var connection = new Connection(socket);
		this._connections[socket.id] = connection;
		// Client sends a message
		socket.on('message', connection.onMessage.bind(connection));
		// Client disconnects
		socket.on('disconnect', connection.onDisconnect.bind(connection));
	},
	
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
 
 
