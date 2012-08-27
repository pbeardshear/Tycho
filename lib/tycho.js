//
//	tycho.js
//

/*
 *
 *	Server framework for setting up real-time multiplayer games
 *	using node.js.  Users only write application specific code,
 *	while tycho takes care of routing and server management.
 *
 */
var _ = require('underscore'),
	Class = require('./class'),
	utils = require('./utils'),
	Server = require('./server'),
	Instance = require('./instance'),
	Connection = require('./connection'),
	Messages = require('./message');

tycho = (function () {
	// @Private namespace
	var _self = {
		maxConnections: 1000,
		directRouting: false,
		autoGenerate: true,
		events: {
			connection: { },
			instance: { },
			server: { }
		}
	};
	
	return {
		// Namespace for outputting debug info to the console
		out: {
			log: function (msg) {
				console.log('\u001b[0;37m   info - ', msg, '\u001b[0;37m');
			},
			warn: function (msg) {
				console.log('\u001b[1;33m   warning - ', msg, '\u001b[0;37m');
			},
			error: function (msg) {
				console.log('\u001b[1;31m   ERROR - ', msg, '\u001b[0;37m');
			}
		},
		
		// Config options
		instanceType: null,
		
		connectionType: null,
		
		routeToInstance: false,
		
		useNames: false,
		
		// Set the state variables to their default values
		loadDefaults: function () {
			this.instanceType = function () { };
			this.connectionType = function () { };
			this.routeToInstance = false;
			this.Messages = require('./message');
		},
		
		initializeRoutes: function () {
			// Create the default routes for server-based functionality
			this.Routes = {
				create: this._createInstance
			};
		},
		
		/*
		 *	The meat of tycho.js
		 *	Creates a new server, based on a passed configuration object
		 *	Config options:
		 *		maxConnections {int} - maximum number of live connections [default: 1000]
		 *		accept {object} - the message object to use for client communication [default: tycho.Message]
		 *		instanceType {object} - the instance type to use internally by tycho.Instance [default: none]
		 *		connectionType {object} - the connection type to use internally by tycho.Connection [default: none]
		 *		routeToInstance {boolean} - indicates whether messages from the client should be routed directly to the instance [default: false]
		 */
		createServer: function (config) {
			if (config) {
				// Set configuration values
				_self.maxConnections = config.maxConnections || 1000;
				_self.directRouting = config.routeToInstance || false;
				_self.autoGenerate = config.autoGenerate || true;
				
				// Set references to user-defined code
				this.routeToInstance = config.routeToInstance || false;
				this.useNames = config.autoName || false;
				this.instanceType = config.instanceType || function () { };
				this.connectionType = config.connectionType || function () { };
				this.Messages = config.accept || (require('./message'));
				// Warnings about config parameters, just in case someone forgot or mistyped
				if (!config.instanceType) {
					this.out.warn('Not using a wrapper type for instances.');
				}
				if (!config.connectionType) {
					this.out.warn('Not using a wrapper type for connections.');
				}
				if (this.useNames && _self.autoGenerate) {
					_self.autoGenerate = false;
					this.out.warn('Unable to auto-generate instances if instances are referenced by name.');
				}
				
				if (config.modules) {
					// Load in custom modules
					// TODO: Modules will need access to server, instances, and connections,
					// how do we provide an interface for that here?
					// Subscribe/publish pattern, for modules to ask for events (new connection,
					// new instance, connection message, etc.) that tycho can then provide?
				}
				// TODO: What was this for?
				// if (!_autocreateInstances) {
					// this._createInstance = this.createInstance;
				// }
			}
			else {
				// User didn't initialize the server with a configuration object, so just use the defaults
				this.out.warn('Creating tycho server with default configuration.');
				this.loadDefaults();
			}
			
			// Initialize default routes
			this.initializeRoutes();
										
			// Publish events for modules to listen on
			this.publish('connection', 'create');
			this.publish('connection', 'message');
			this.publish('connection', 'disconnect');
			this.publish('instance', 'create');
			this.publish('instance', 'connection');
			this.publish('instance', 'disconnect');
			this.publish('server', 'start');
			this.publish('server', 'instance');
			this.publish('server', 'connection');
			
			// Create the server object
			this.server = new Server(this.useNames, _self.autoGenerate);
			// Allow method chaining
			return this;
		},
		
		listen: function (port) {
			this.server.listen(port);
			return this;
		},
		
		close: function () {
			this.server.close();
		},
		
		// Close down all connections, instances, and servers in this tycho instance
		// Revert to an initial state
		end: function () {
			this.server.end();
			this.dropEvents();
			// Reset properties to defaults
			this.loadDefaults();
			this.initializeRoutes();
		},
		
		// Publish and subscribe pattern for modules to bind to server events
		dropEvents: function () {
			// Reset the events object
			_self.events = {
				connection: { },
				instance: { },
				server: { }
			};
		},
		
		publish: function (target, eventName) {
			var events = _self.events[target];
			if (events) {
				// Valid target
				if (!events[eventName]) {
					events[eventName] = [];
				}
			}
		},
		
		subscribe: function (target, eventName, fn) {
			var events = _self.events[target];
			if (events && events[eventName]) {
				events[eventName].push(fn);
			}
			else {
				this.out.warn('Cannot subscribe to event ' + eventName + ' on target ' + target);
			}
		},
		
		fireEvent: function (target, eventName, scope, args) {
			var events = _self.events[target];
			if (events && events[eventName]) {
				for (var i = 0; i < events[eventName].length; i++) {
					if (typeof events[eventName][i] === 'function') {
						events[eventName][i].apply(scope, args || []);
					}
				}
			}
		}
	};
})();

process.on('uncaughtException', function (exception) {
	tycho.out.error(exception.stack);
});

module.exports = tycho;
