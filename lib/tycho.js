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
var log = require('./log'),
	lib = require('./lib'),
	Server = require('./server'),
	Instance = require('./instance'),
	Connection = require('./connection'),
	Messages = require('./message');
	
tycho = (function () {
	var self = {
		events: {
			server: {},
			instance: {},
			connection: {}
		},
		routes: {}
	};
	
	// Define the default routes that tycho uses internally
	self.routes = {
		handshake: function () { },
		accept: function () { },
		ping: function () { }
	};
	
	return {
		/* NEW API */
		createServer: function (config) {
			// Publish events for others to subscribe to
			this.publish('connection', 'create');
			this.publish('connection', 'message');
			this.publish('connection', 'disconnect');
			this.publish('instance', 'create');
			this.publish('instance', 'connection');
			this.publish('instance', 'disconnect');
			this.publish('server', 'start');
			this.publish('server', 'instance');
			this.publish('server', 'connection');
			
			this.server = new Server(config);
			if (config) {
				if (config.routes && config.routes.server && config.routes.instance && config.routes.connection) {
					// User namespaced the routes themselves
					this.server.initializeRoutes(lib.apply(config.routes.server || {}, self.routes, true), config.routes.instance, config.routes.connection);
				}
				else {
					this.server.initializeRoutes(lib.apply(config.routes || {}, self.routes, true));
				}
			}
			return this;
		},
		
		listen: function (port, host) {
			this.server.listen(port, host);
			return this;
		},
		
		close: function () {
			this.server.close();
		},
		
		end: function () {
			this.server.end();
			this.dropEvents();
		},
		
		// Subscriber pattern for plugins
		publish: function (target, name) {
			var events = self.events[target];
			if (events) {
				if (!events[name]) {
					events[name] = {};
				}
			}
		},
		
		subscribe: function (target, name, fn, id) {
			var events = self.events[target];
			if (events && events[name]) {
				id = id || lib.guid2();
				events[name][id] = fn;
				return id;
			}
		},
		
		// id can be either the identifier passed to subscribe, or the function
		unsubscribe: function (target, name, id) {
			var events = self.events[target];
			if (events && events[name]) {
				if (typeof id === 'string' && events[name][id]) {
					delete events[name][id];
				}
				else if (typeof id === 'function') {
					lib.each(events[name], function (fn) {
						if (fn === id) {
							delete events[name][id];
						}
					});
				}
			}
		},
		
		fireEvent: function (target, name, scope, args) {
			var events = self.events[target];
			if (events && events[name]) {
				lib.each(events[name], function (fn) {
					fn.apply(scope, args || []);
				});
			}
		},
		
		dropEvents: function () {
			lib.each(self.events, function (_, target) {
				self.events[target] = {};
			});
		}
	};
})();

process.on('uncaughtException', function (exception) {
	log.error(exception.stack);
});

module.exports = tycho;
