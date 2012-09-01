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

Server = Class({
	/* NEW API */
	connections: {},
	instances: {},
	
	init: function (config) {
		var fileServer;
		// Set up configuration values
		config ? log.out('Creating server.') : log.warn('Creating server with default configuration.');
		lib.apply(this, config);
		// Fill in default values for everything that wasn't passed
		this.loadDefaults();
		if (!this.namedInstances) {
			// If instances are not named, the server does full management (uses LRU scheme for balancing)
			instances = [];
		}
		
		fileServer = new static.Server(this.root);
		this.httpServer = http.createServer(function (req, res) {
			req.addListener('end', function () {
				fileServer.serve(req, res);
			});
		});
		
		io.listen(this.httpServer).of('/tycho').on('connection', this.registerConnection.bind(this));
		
		
		log.out('Starting server.');
		tycho.fireEvent('server', 'start', this);
	},
	
	listen: function (port, host) {
		this.httpServer.listen(port, host);
	},
	
	close: function () {
		this.httpServer.close();
		tycho.fireEvent('server', 'close', this);
	},
	
	end: function () { },
	
	// Ask the server to create a new instance
	registerInstance: function (name) {
		var instance;
		if (lib.size(this.instances) < this.maxInstances) {
			log.out('New instance:', name);
			instance = new Instance(this, name);
			if (this.namedInstances) {
				this.instances[name] = instance;
			}
			else {
				this.instances.unshift(instance);
			}
			tycho.fireEvent('server', 'instance', this, instance);
		}
		else {
			log.error('Unable to register new instance.', this.maxInstances, 'instances already registered.');
		}
		return instance;
	},
	
	// Accept a new socket connection to the server
	registerConnection: function (socket) {
		var connection;
		log.out('New connection.');
		if (lib.size(this.connections) < this.maxConnections) {
			connection = new Connection(this, socket);
			this.connections[socket.id] = connection;
			socket.on('message', connection.onMessage.bind(connection));
			socket.on('disconnect', connection.onDisconnect.bind(connection));
			
			// Auto-assigning new connections, and reconnections
			if (this.autoAssignConnections || connection.instance) {
				if (this.autoCreateInstances && lib.size(this.instances) === 0) {
					// No instances, so let's add one
					this.registerInstance(lib.guid());
				} 
				this.handConnection(connection, connection.instance);
			}
			tycho.fireEvent('server', 'connection', this, connection);
		}
		else {
			log.error('Unable to register new connection.  Maximum connections reached.');
		}
		return connection;
	},
	
	// Pass control of a connection from the server to an instance
	handConnection: function (connection, name) {
		var instance = this.namedInstances ? instances[name] : instances[0];
		if (instance) {
			instance.handConnection(connection);
			if (!this.namedInstances) {
				lib.moveBack(instances, 0);
			}
		}
		else {
			log.error('Unable to hand connection to instance:', name, '.  Instance does not exist.');
		}
	},
	
	// Notify when a connection drops from the server
	dropConnection: function (connection) {
		// Connection is down
		delete this.connections[connection.id];
		if (!this.namedInstances) {
			// Move the disconnecting instance to the front
			var index = lib.find(this.instances, 'name', connection.instance, true);
			if (index) {
				lib.moveFront(this.instances, index);
			}
		}
	},
	
	// @Private
	// Set up the messaging routes that are used internally by tycho
	initializeRoutes: function () {
		this.Routes = { };
	},
	
	// @Private
	loadDefaults: function () {
		// Default configuration values
		lib.apply(this, {
			maxConnections: 100,
			maxInstances: 10,
			namedInstances: false,
			autoCreateInstances: true,
			autoAssignConnections: true,
			directRouting: false,
			binding: {
				instance: function () { },
				connection: function () { }
			}
		});
	}
	
	
	/* OLD API */
	_connections: {},
	_instances: {},
	_instanceLRU: [],
	_maxInstances: 10,
	_namedInstances: false,
	_autoCreateInstances: false,
	
	// Constructor
	init: function (namedInstances, autoCreateInstances, autoAssignConnections, root) {
		// Initialize the http server
		var fileServer = new static.Server(root);
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
		this._autoCreateInstances = autoCreateInstances;
		this._autoAssignConnections = autoAssignConnections;
		
		tycho.fireEvent('server', 'start', this);
	},
	
	listen: function (port, host) {
		this._port = port;
		this._httpServer.listen(port, host);
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
		var inst = new Instance(this, name);
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
		
		if (this._autoCreateInstances) {
			// Check if we have no instances, or if they are too full
			var instances = this._namedInstances ? this._instances : this._instanceLRU;
			if (utils.size(instances) == 0) {
				this.registerInstance(utils.guid());
			}
			// TODO: Implement load balancing
		}
		tycho.fireEvent('server', 'connection', this, connection);
		if (this._autoAssignConnections) {
			if (!this._namedInstances) {
				this.handConnection(connection);
			}
			else {
				tycho.out.warn('Unable to automatically assign connections when instances are named.');
			}
		}
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
 
 
