//
//	server.js
//

var log = require('./log'),
	lib = require('./lib'),
	url = require('url'),
	http = require('http'),
	send = require('send'),
	io = require('socket.io');

module.exports = Server = (function () {
	//	Private constructor
	// ----------------------------------------------------------------------------------------------------------------
	var self = function (config) {
		this.loadDefaults();
		if (config && lib.size(config) > 0) {
			log.out('Creating server.');
			lib.apply(this, config, true);
		}
		else {
			log.warn('Creating server with default configuration.');
		}
		
		var root = this.root;
		// this.binding = new this.binding.server();
		this.bound = this.binding.server();
		this.connections = {};
		this.connectionBindings = {};
		this.instances = this.namedInstances ? {} : [];
		this.instanceBindings = this.namedInstances ? {} : [];
		
		// Bind public interface to user-defined class
		lib.apply(this.bound, lib.bindAll(public, this));
		
		// Create static http server to serve files
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
						send(req, req.url).root(process.cwd() + root).pipe(res);
						break;
				}
			});
		});
		
		// Start socket.io
		this.ws = io.listen(this.httpServer, { 'log level': 0 });
		this.ws.of('/tycho').on('connection', this.registerConnection.bind(this));
		this.sockets = this.ws.of('/tycho');
		
		log.out('Starting server.');
		tycho.fireEvent('server', 'start', this);
	};
	
	//	Private methods
	// ----------------------------------------------------------------------------------------------------------------
	self.prototype = {
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
			var instance = null;
			if (lib.size(this.instances) < this.maxInstances) {
				log.out('New instance:', name);
				instance = new Instance(this, name);
				if (this.namedInstances) {
					this.instances[name] = instance;
					this.instanceBindings[name] = instance.binding;
				}
				else {
					this.instances.unshift(instance);
					this.instanceBindings.unshift(instance.binding);
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
			var connection = null;
			log.out('New connection.');
			if (lib.size(this.connections) < this.maxConnections) {
				connection = new Connection(this, socket);
				this.connections[socket.id] = connection;
				this.connectionBindings[socket.id] = connection.binding;
				socket.on('message', connection.onMessage.bind(connection));
				socket.on('disconnect', connection.onDisconnect.bind(connection));
				
				// Auto-assigning new connections, and reconnections
				// TODO: Reconnecting is not going to work - connection.instance doesn't get set
				// until a connection is handed off to the instance.  Also, connection.get is async
				if (this.autoAssignConnections || (this.allowReconnect && connection.instance)) {
					if (this.autoCreateInstances && lib.size(this.instances) === 0) {
						// No instances, so let's add one
						this.registerInstance(lib.guid());
					}
					// Auto assigning connections currently only works with non-named instances
					if (!this.namedInstances) {
						this.handConnection(connection, this.instances[0].name);
					}
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
			var instance = this.namedInstances ? this.instances[name] : this.instances[0];
			if (instance) {
				instance.handConnection(typeof connection === 'string' ? this.connections[connection] : connection);
				if (!this.namedInstances) {
					lib.moveBack(this.instances, 0);
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
					lib.moveFront(this.instanceBindings, index);
				}
			}
		},
		
		// instance can be a full instance object, or the name of an instance (usually in the case of named instances)
		dropInstance: function (instance) {
			if (typeof instance === 'string' && !this.namedInstances) {
				log.error('Unable to remove instance by name.  Not using named instances.');
				return;
			}
			instance = typeof instance === 'string' ? this.instances[instance] : instance;
			if (instance) {
				// Clear all connections from the instance
				instance.end();
				if (Array.isArray(this.instances)) {
					lib.remove(this.instances, lib.find(this.instances, 'name', instance.name, true));
				}
				else {
					delete this.instances[instance.name];
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
				messages: require('./message'),
				binding: {
					server: function () { },
					instance: function () { },
					connection: function () { }
				}
			});
		},
		
		// @Private
		handleMessage: function (connection, message) {
			var target,
				route;
			// Let the messaging system handle the message
			if (this.messages.receive) {
				this.messages.receive(message, connection);
			}
			// Pass the message off to a route if one is defined
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
			route.call(target.binding, message.data, connection.binding, target);
		}
	};
	
	// Public interface for bound classes
	// ----------------------------------------------------------------------------------------------------------------
	var public = {
		// Retrieve a connection binding by id
		getConnection: function (id) {
			return (this.connections[id] && this.connections[id].binding) || null;
		},
		
		// Return the list of connections
		getConnections: function () {
			return this.connectionBindings;
		},
		
		// Retrieve an instance by name, if using named instances
		getInstance: function (name) {
			if (this.namedInstances) {
				return (this.instances[name] && this.instances[name].binding) || null;
			}
			return null;
		},
		
		// Return the list of instances
		getInstances: function () {
			return this.instanceBindings;
		},
		
		// Create a new instance, using the given name if namedInstances is set
		host: function (name) {
			this.registerInstance(name);
		},
		
		// Add a connection to the instance defined by name
		join: function (name, connection) {
			this.handConnection(connection.__internal, name);
		},
		
		// Broadcast a message to every connection on this server
		broadcast: function (name, message, callback) {
			lib.each(this.connections, function (conn) {
				conn.send(name, message, callback);
			});
		}
	};
	
	// Interface for tycho
	return self;
})();