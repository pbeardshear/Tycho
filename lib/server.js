//
//	server.js
//

/*
 *
 *	The server component of tycho.js.
 * 	One of the three main components of tycho.js, in addition to instance.js and connection.js
 *
 */
 
var Class = require('./class'),
	log = require('./log'),
	lib = require('./lib'),
	url = require('url'),
	http = require('http'),
	send = require('send'),
	io = require('socket.io');

Server = Class({
	connections: {},
	instances: {},
	
	init: function (config) {
		var self = this,
			fileServer,
			ws;
		// Set up configuration values
		config ? log.out('Creating server.') : log.warn('Creating server with default configuration.');
		lib.apply(this, config);
		// Fill in default values for everything that wasn't passed
		this.loadDefaults();
		if (!this.namedInstances) {
			// If instances are not named, the server does full management (uses LRU scheme for balancing)
			instances = [];
		}
		
		this.httpServer = http.createServer(function (req, res) {
			req.addListener('end', function () {
				// Bind some specific handlers for tycho client code
				switch (req.url) {
					case '/tycho/tycho.js':
						send(req, __dirname + '/tycho-client.js').pipe(res);
						break;
					case '/tycho/message.js':
						send(req, __dirname + '/message.js').pipe(res);
						break;
					default:
						send(req, req.url).root(process.cwd() + self.root).pipe(res);
						break;
				}
			});
		});
		
		ws = io.listen(this.httpServer);
		ws.of('/tycho').on('connection', this.registerConnection.bind(this));
		this.sockets = ws.of('/tycho');
		
		log.out('Starting server.');
		tycho.fireEvent('server', 'start', this);
	},
	
	listen: function (port, host) {
		this.port = port;
		this.host = host;
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
			if (this.autoAssignConnections || (this.allowReconnect && connection.instance)) {
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
	initializeRoutes: function (serverRoutes, instanceRoutes, connectionRoutes) {
		this.routes = {
			server: serverRoutes,
			instance: instanceRoutes || this.binding.instance.routes,
			connection: connectionRoutes || this.binding.connection.routes
		};
	},
	
	// @Private
	loadDefaults: function () {
		// Default configuration values
		lib.apply(this, {
			root: '/',
			maxConnections: 100,
			maxInstances: 10,
			namedInstances: false,
			autoCreateInstances: true,
			autoAssignConnections: true,
			allowReconnect: true,
			directRouting: false,	// TODO: deprecate
			binding: {
				instance: function () { },
				connection: function () { }
			}
		});
	},
	
	// @Private
	handleMessage: function (connection, message) {
		var target,
			route;
		if (this.routes.server[message.type]) {
			target = this;
			route = this.routes.server[message.type];
		}
		else if (this.routes.instance[message.type]) {
			target = connection.instance;
			route = this.routes.instance[message.type];
		}
		else if (this.routes.connection[message.type]) {
			target = connection;
			route = this.routes.connection[message.type];
		}
		route.call(target, message, target.binding);
	}
});

module.exports = Server;
 
 
