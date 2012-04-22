//
//	spine.js
//

/*
 *
 *	Server framework for setting up real-time multiplayer games
 *	using node.js.  Users only write application specific code,
 *	while spine takes care of routing and server management.
 *
 */
var Server = require('./server'),
	Instance = require('./instance'),
	Connection = require('./connection'),
	Messages = require('./message');
 
spine = (function () {
	var _maxConnections,
		_message,
		_internalInstance,
		_internalConnection;
	
	return {
		// Config options
		instanceType: function () {
			return _internalInstance;
		},
		connectionType: function () {
			return _internalConnection;
		},
		
		routeToInstance: function () {
			return _directRouting;
		},
		
		// Set the state variables to their default values
		loadDefaults: function () {
			_maxConnections = 1000;
			_message = Messages;
			_directRouting = false;
			_internalInstance = null;
			_internalConnection = null;
		},
		/*
		 *	The meat of spine.js
		 *	Creates a new server, based on a passed configuration object
		 *	Config options:
		 *		maxConnections {int} - maximum number of live connections [default: 1000]
		 *		accept {object} - the message object to use for client communication [default: spine.Message]
		 *		instanceType {object} - the instance type to use internally by spine.Instance [default: none]
		 *		connectionType {object} - the connection type to use internally by spine.Connection [default: none]
		 *		routeToInstance {boolean} - indicates whether messages from the client should be routed directly to the instance [default: false]
		 */
		createServer: function (config) {
			if (config) {
				_maxConnections = config.maxConnections || 1000;
				_message = config.accept || Messages;
				_directRouting = config.routeToInstance || false;
				if (!config.instanceType) {
					console.warn('Not using a wrapper type for instances.');
				}
				_internalInstance = config.instanceType || null;
				if (!config.connectionType) {
					console.warn('Not using a wrapper type for connections.');
				}
				_internalConnection = config.connectionType || null;
			}
			else {
				// User didn't initialize the server with a configuration object, so just use the defaults
				console.warn('Creating spine server with default configuration.');
				this.loadDefaults();
			}
			
			// Create the server object
			this.server = new Server();
		},
		
		listen: function (port) {
			this.server.listen(port);
		}
	};
})();

module.exports = spine;
