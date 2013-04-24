//
// tycho.js
//
var Server = require('./server'),
	TCPServer = require('/servers/TCPServer'),
	UDPServer = require('/servers/UDPServer'),
	WSServer = require('/servers/WebSocketServer'),
	lib = require('./lib'),
	log = require('./log'),
	implement = require('./implement'),
	evented = require('./event'),
	cluster = require('cluster'),
	os = require('os');

/**
 * Main entry point into the tycho library
 * tycho.init(...) performs initialization for the library
 * and creates servers.
 */
var tycho = (function () {
	var self = {
		server: null,
		config: null,
		workers: {},
		callbacks: {}
	};
	var cpus = os.cpus().length;

	//------------------------------------------
	function handleOnline(worker) {
		// Worker online
		log.out('Worker online:', worker.id);
		this.fire('online', worker);
	}

	function handleListening(worker, address) {
		log.out('Worker', worker.id, 'listening on', address.address, address.port);
		this.fire('listening', worker, address);
	}

	function handleDisconnect(worker) {
		log.out('Worker disconnect:', worker.id);
		this.fire('disconnect', worker);
	}

	function handleExit(worker, code, signal) {
		log.out('Worker exited:', worker.id);
		this.fire('exit', worker, code, signal);
		delete self.workers[worker.id];
		if (self.config.reviveWorkers) {
			var zombie = cluster.fork(self.config);
			self.workers[zombie.id] = zombie;
		}
	}

	function handleMessage(worker, message) {
		if (message.id in self.callbacks && message.type === 'ack') {
			handleWorkerAck(worker, self.callbacks[message.id]);
		}
		this.fire('message', worker, message);
	}

	// Remove the worker from the queue,
	// executing the callback if no workers remain
	function handleWorkerAck(worker, buffer) {
		var id = buffer.queue.indexOf(worker.id);
		buffer.queue.splice(id, 1);
		if (buffer.queue.length === 0) {
			buffer.fn();
		}
	}

	// Create a message queue for handling
	// worker acknowledgements of commands
	function bindWorkerAck(id, callback) {
		self.callbacks[id] = { queue: [], fn: callback };
		lib.each(self.workers, function (worker) {
			self.callbacks[id].queue.push(worker.id);
		});
	}

	function shutDownServer() {
		self.servers.forEach(function (server) {
			server.close(true);
		});
		self.servers = null;
		this.initialized = false;
		this.running = false;
		log.out('Server shutdown.');
		this.fire('stop');
	}

	function onStart() {
		this.running = true;
		log.out('Server started.');
		this.fire('start');
	}

	function onStop() {
		// Shutdown the processes
		cluster.disconnect(shutDownServer.bind(this));
	}

	function onPause() {
		self.servers.forEach(function (server) {
			server.pause();
		});
		this.running = false;
		log.out('Server paused.');
		this.fire('pause');
	}

	// ----------------------------------------------------

	function initializeServers(servers) {
		// Find which servers we need to create
		var index = {};
		self.servers = [];
		
		// Build a lookup index of server type => server config
		servers.forEach(function (server) {
			index[server.type] = server;
		});

		self.config.serverIndex = index;

		if (tycho.connectionTypes.TCP in index) {
			self.servers.push( new TCPServer(index[tycho.connectionTypes.TCP]) );
		}
		if (tycho.connectionTypes.UDP in index) {
			self.servers.push( new TCPServer(index[tycho.connectionTypes.UDP]) );
		}
		if (tycho.connectionTypes.WEBSOCKET in index) {
			var wsPort = index[tycho.connectionTypes.WEBSOCKET].port;
			if (!tcpPort || tcpPort !== wsPort) {
				self.servers.push( new TCPServer(index[tycho.connectionTypes.WEBSOCKET]) );	
			}
			else {
				// TCP and Websocket ports are the same - no good
				throw new Error('The TCP port must be different than the WebSocket port.');
			}
		}
	}

	function initializeCluster(count) {
		cluster.setupMaster({
			exec: '../lib/worker.js'
		});

		for (var i = 0; i < count; i++) {
			var worker = cluster.fork({
				config: JSON.stringify(self.config),
				connectionTypes: JSON.stringify(tycho.connectionTypes)
			});
			self.workers[worker.id] = worker;
			worker.on('message', handleMessage.bind(this, worker));
		}

		// Event handlers
		cluster.on('online', handleOnline.bind(this));
		cluster.on('listening', handleListening.bind(this));
		cluster.on('disconnect', handleDisconnect.bind(this));
		cluster.on('exit', handleExit.bind(this));
	}

	return {
		initialized: false,
		running: false,

		init: function (config) {
			if (this.initialized) {
				log.warn('Unable to initialize Tycho.  Tycho has already been initialized.');
				return;
			}
			self.config = config;
			// TODO: Inter-server communication?
			if (config.multicore) {
				var clusterCount = config.workers || cpus;
				initializeCluster(clusterCount);
			}
			// Create the primary server
			initializeServers(config.servers);
			// Initialize the logger
			lib.apply(log.settings, config.log || {}, true);
			this.initialized = true;
		},

		// If a port is supplied here, it overrides the one provided in the config
		// TODO: differentiate server port numbers
		start: function () {
			self.servers.forEach(function (server) {
				server.start(port);
			});
			// Start the worker processes
			// TODO: Rework this to fit in with multiple server architecture
			if (self.config.cluster) {
				this.alertWorkers('start', { port: (port || self.server.port) }, onStart);
			}
			else {
				onStart.call(this);
			}
		},

		// Stop all worker processes and shut down the server
		// A call to init() is required after calling stop()
		stop: function () {
			if (this.running || self.servers) {
				if (self.config.cluster) {
					this.alertWorkers('stop', null, onStop);
				}
				else {
					onStop.call(this);
				}
			}
		},

		// Pause worker processes, which causes all workers to suspend
		// responses from connecting clients
		pause: function () {
			if (this.running) {
				if (self.config.cluster) {
					this.alertWorkers('pause', null, onPause);
				}
				else {
					onPause.call(this);
				}
			}
		},

		alertWorkers: function (msgType, msgData, callback) {
			var id = lib.guid();
			lib.each(self.workers, function (worker) {
				worker.send(lib.apply({ type: msgType, id: id }, msgData || {}));
			});
			bindWorkerAck(id, callback.bind(this));
		},

		// [DEPRECATED]
		createServer: function (config) {
			// var id = lib.guid();
			// self.servers[id] = new Server(config);
			// return self.servers[id];
		}
	};
})();

// Add the base constants to the tycho object
lib.apply(tycho, require('./constants'));
implement(tycho, evented, ['start', 'stop', 'pause', 'message', 'online', 'listening', 'disconnect', 'exit']);
module.exports = tycho;
