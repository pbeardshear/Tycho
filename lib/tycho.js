//
// tycho.js
//
var Store = require('./store'),
	cluster = require('cluster'),
	lib = require('./lib'),
	log = require('./log'),
	net = require('net'),
	os = require('os'),
	Q = require('q');

(function () {
	/**
	 * Global namespace
	 */
	var self = {};

	/**
	 * Initialization methods
	 */
	function initializeStore(config) {
		self.store = new Store(config.master, config);
		self.store.on('message', handleIncomingMessage);
		log.out('Store initialized.');
	}

	function initializeControl(config) {
		self.control = net.createServer(handleControlConnection);
		self.control.listen(config.port, config.host);
		log.out('Control server initialized.');
	}

	function initializeWorkers(config) {
		cluster.setupMaster({
			exec: '../lib/worker.js'
		});

		self.workers = {};
		for (var i = 0; i < config.workers; i++) {
			var worker = cluster.fork({
				config: JSON.stringify(config)
			});
			self.workers[worker.id] = worker;
		}
		log.out('Workers initialized.');

		cluster.on('exit', handleWorkerRestart);
	}

	/**
	 * Handler for messages from the store
	 */
	function handleIncomingMessage(event, message, source) {
		var blocks = event.split(':'),
			id = blocks[2] || blocks[1];
		if (id in self.transactions && source in self.transactions[id]) {
			self.transactions[id][source].resolve([message, source]);
		}
	}

	/**
	 * Handler for new connections to the control server
	 * Also defines the valid commands that can be issued to workers
	 */
	function handleControlConnection(connection) {
		connection.on('data', function (data) {
			var request = data.toString().split(' '),
				cmd = request[0],
				target = request[1];
			switch (cmd) {
				case 'start':
					self.store.broadcast('worker:start', target);
					break;
				case 'pause':
					self.store.broadcast('worker:pause', target);
					break;
				case 'stop':
					self.store.broadcast('worker:stop', target);
					break;
				case 'resume':
					self.store.broadcast('worker:pause', target);
					break;
				case 'heartbeat':
					var id = lib.guid();
					self.store.broadcast('worker:heartbeat', id);
					wait(id, function () {
						var args = Array.prototype.slice.call(arguments),
							response = {};
						lib.each(args, function (data) {
							var worker = data[0],
								message = data[1];
							response[worker] = message;
						});
					});
					connection.write(JSON.stringify(response));
					break;
				case 'stats':
					var id = lib.guid();
					self.store.broadcast('worker:stats', id);
					wait(id, function () {
						var args = Array.prototype.slice.call(arguments),
							response = {};
						lib.each(args, function (data) {
							var worker = data[0],
								message = data[1];
							response[worker] = message;
						})
					});
					connection.write(JSON.stringify(response));
					break;
				default:
					break;
			}
			connection.end();
		});
	}

	/**
	 * Restart a worker when one goes offline
	 */
	function handleWorkerRestart(worker, code, signal) {
		delete self.workers[worker.id];
		if (self.reviveWorkers) {
			var zombie = cluster.fork({
				config: JSON.stringify(self.config)
			});
			self.workers[zombie.id] = zombie;
		}
	}

	/**
	 * Create a transaction which resolves when a response
	 * is heard from each active worker
	 */
	function wait(id, callback) {
		var promises = [];

		self.transactions[id] = {};
		lib.each(self.workers, function (worker) {
			var deferred = Q.defer();
			self.transactions[id][worker.id] = deferred;
			promises.push(deferred.promise);
		});

		Q.spread(promises, callback);
	}

	/**
	 * Initialization function for tycho
	 *
	 * Required configuration settings:
	 *	run [string] - main file to run in each worker process
	 *	servers [array] - array of server config objects
	 */
	exports.init = function (config) {
		lib.require(config, ['run', 'servers']);

		// All configuration options used in tycho
		self.config = {
			run: null,
			servers: null,

			workers: os.cpus().length,
			control: { port: 7331 },
			store: { port: 6379, master: 'tycho:master' },
			log: { enabled: true, color: true, level: 3 },
			reviveWorkers: true
			// TODO
		};

		self.transactions = {};

		lib.apply(self.config, config, true, true);

		initializeStore(self.config.store);
		initializeWorkers(self.config);
		if (self.config.control) {
			initializeControl(self.config.control);
		}
		else {
			log.out('Control server disabled.');
		}

		lib.apply(log.settings, self.config.log, true);

		wait('ready', function () {
			self.store.broadcast('worker:start');
		});
	};

	/**
	 * Useful library functions
	 */
	exports.lib = lib;

	/**
	 * Colored logging, with varying levels of importance
	 */
	exports.log = log;

	/**
	 * Constants used in tycho
	 */
	exports.constants = require('./constants');
})();
