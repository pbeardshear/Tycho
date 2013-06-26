//
// tycho.js
//
var Server = require('./server'),
	TCPServer = require('./servers/TCPServer'),
	UDPServer = require('./servers/UDPServer'),
	WSServer = require('./servers/WebSocketServer'),
	Router = require('./router'),
	EventEmitter = require('events').EventEmitter;
	lib = require('./lib'),
	log = require('./log'),
	cluster = require('cluster'),
	os = require('os'),
	Q = require('q');

/**
 * Main entry point into the tycho library
 * tycho.init(...) performs initialization for the library
 * and creates servers.
 */
var tycho = (function () {
	var self = {
		servers: null,
		config: null,
		workers: {},
		callbacks: {},
		transactions: {}
	};
	var cpus = os.cpus().length;

	//------------------------------------------
	function handleOnline(worker) {
		// Worker online
		log.out('Worker online:', worker.id);
		this.emit('online', worker);
	}

	function handleListening(worker, address) {
		log.out('Worker', worker.id, 'listening on', address.address, address.port);
		this.emit('listening', worker, address);
	}

	function handleDisconnect(worker) {
		log.out('Worker disconnect:', worker.id);
		this.emit('disconnect', worker);
	}

	function handleExit(worker, code, signal) {
		log.out('Worker exited:', worker.id);
		this.emit('exit', worker, code, signal);

		delete self.workers[worker.id];
		if (self.config.reviveWorkers) {
			var worker = cluster.fork({
				config: JSON.stringify(self.config)
			});
			self.workers[worker.id] = worker;
		}
	}

	// function handleMessage(worker, message) {
	// 	if (message.id in self.callbacks && message.type === 'ack') {
	// 		handleWorkerAck(worker, self.callbacks[message.id]);
	// 	}
	// 	this.emit('message', worker, message);
	// }

	// Remove the worker from the queue,
	// executing the callback if no workers remain
	function handleWorkerAck(worker, deferred) {
		deferred.resolve();
	}

	function shutDownServer() {
		self.servers.forEach(function (server) {
			server.close(true);
		});
		self.servers = null;
		this.initialized = false;
		this.running = false;
		log.out('Server shutdown.');
		this.emit('stop');
	}

	function onInit() {
		this.initialized = true;
		this.emit('init');
	}

	function onReady() {
		this.emit('ready');
	}

	function onStart() {
		this.running = true;
		log.out('Server started.');
		this.emit.apply(this, ['start'].concat(self.servers));
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
		this.emit('pause');
	}

	function handleMessage(type, message, source) {
		var namespace = type.split(':')[0],
			eventName = type.split(':')[1];
		switch (namespace) {
			case 'worker':
				if (source !== 'master') {
					handleWorkerMessage.call(this, source, eventName, message);	
				}
				break;
			case 'manager':
			case 'server':
			default:
				this.emit(eventName, message);
				break;
		}
	}

	function handleWorkerMessage(workerID, type, message) {
		console.log('--- received worker message:', type);
		if (type in self.transactions && workerID in self.transactions[type]) {
			self.transactions[type][workerID].resolve();
		}
	}

	// ----------------------------------------------------

	function initializeServers(servers) {
		// Find which servers we need to create
		var tcpPort,
			wsPort;

		self.servers = servers.map(function (config) {
			if (tycho.connectionTypes.TCP === config.type) {
				tcpPort = config.port;
				return new TCPServer(config);
			}
			if (tycho.connectionTypes.UDP === config.type) {
				return new UDPServer(config);
			}
			if (tycho.connectionTypes.WEBSOCKET === config.type) {
				wsPort = config.port;
				return new WSServer(config);
			}
		});

		if (tcpPort !== undefined && tcpPort === wsPort) {
			self.servers = [];
			throw new Error('TCP port and WebSocket ports must be different.');
		}
	}

	function initializeClusters(count) {
		cluster.setupMaster({
			exec: '../lib/worker.js'
		});

		for (var i = 0; i < count; i++) {
			var worker = cluster.fork({
				config: JSON.stringify(self.config)
			});
			self.workers[worker.id] = worker;
			worker.on('message', handleMessage.bind(this));
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
			// Initialize master routing ID
			self.config.master = 'master';
			// TODO: Inter-server communication?

			if (config.multicore) {
				var clusterCount = config.workers || cpus;
				initializeClusters.call(this, clusterCount);

				this.wait('init', onInit.bind(this));
				this.wait('ready', onReady.bind(this));
			}

			self.router = new Router(self.config.master, self.config.router);
			self.router.on('message', handleMessage.bind(this));
			// Create the primary server
			// initializeServers(config.servers);
			// Initialize the logger
			lib.apply(log.settings, config.log || {}, true);
			this.initialized = true;
		},

		// If a port is supplied here, it overrides the one provided in the config
		// TODO: differentiate server port numbers
		start: function () {
			// self.servers.forEach(function (server) {
			// 	server.start();
			// });
			// Start the worker processes
			// TODO: Rework this to fit in with multiple server architecture
			if (self.config.multicore) {
				console.log('STARTING');
				this.broadcastWorkers('worker:start');
				this.wait('start', onStart.bind(this));
				// Q.spread(this.broadcastWorkers('worker:start', null, 'start'), onStart);
			}
			else {
				onStart.call(this);
			}
		},

		// Stop all worker processes and shut down the server
		// A call to init() is required after calling stop()
		stop: function () {
			if (this.running || self.servers) {
				if (self.config.multicore) {
					this.broadcastWorkers('worker:stop');
					this.wait('stop', onStop.bind(this));
					// Q.spread(this.broadcastWorkers('worker:stop'), onStop);
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
				if (self.config.multicore) {
					this.broadcastWorkers('worker:pause');
					this.wait('pause', onPause.bind(this));
					// Q.spread(this.broadcastWorkers('worker:pause'), onPause);
				}
				else {
					onPause.call(this);
				}
			}
		},

		broadcastWorkers: function (name, message) {
			self.router.broadcast(name, message);
		},

		wait: function (name, finish) {
			var promises = [];

			self.transactions[name] = {};
			lib.each(self.workers, function (worker) {
				var deferred = Q.defer();
				self.transactions[name][worker.id] = deferred;
				promises.push(deferred.promise);
			});

			Q.spread(promises, finish);
		}
	};
})();

// Add the base constants to the tycho object
lib.apply(tycho, require('./constants'));
tycho.emit = EventEmitter.prototype.emit.bind(tycho);
tycho.on = EventEmitter.prototype.on.bind(tycho);
// lib.inherits(tycho, EventEmitter);
module.exports = tycho;
