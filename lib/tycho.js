//
// tycho.js
//
var Server = require('./server'),
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
		workers: {}
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
		// TODO: should we handle acks back from the worker processes?
		this.fire('message', worker, message);
	}

	return {
		init: function (config) {
			self.config = config;
			// TODO: Inter-server communication?
			if (config.cluster) {
				var clusterCount = config.clusters || cpus;
				cluster.setupMaster({
					exec: 'worker.js'
				});

				for (var i = 0; i < clusterCount; i++) {
					var worker = cluster.fork({ config: JSON.stringify(config) });
					self.workers[worker.id] = worker;
					worker.on('message', handleMessage.bind(this, worker));
				}

				// Event handlers
				cluster.on('online', handleOnline.bind(this));
				cluster.on('listening', handleListening.bind(this));
				cluster.on('disconnect', handleDisconnect.bind(this));
				cluster.on('exit', handleExit.bind(this));
			}
			// Create the master server
			self.server = new Server(config);
		},

		// If a port is supplied here, it overrides the one provided in the config
		start: function (port) {
			self.server.start(port);
			// Start the worker processes
			lib.each(self.workers, function (worker) {
				worker.send({ type: 'start', port: (port || self.server.port) });
			});
		},

		// [DEPRECATED]
		// The entry point into tycho
		createServer: function (config) {
			// var id = lib.guid();
			// self.servers[id] = new Server(config);
			// return self.servers[id];
		}
	};
})();

implement(tycho, evented, ['start', 'message', 'online', 'listening', 'disconnect', 'exit']);
module.exports = tycho;