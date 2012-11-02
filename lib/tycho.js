//
// tycho.js
//
var Server = require('server'),
	lib = require('../lib'),
	log = require('../log');

var tycho = (function () {
	var self = {
		servers: {},
		events: {
			server: {},
			instance: {},
			connection: {}
		}
	};

	return {
		// The entry point into tycho
		createServer: function (config) {
			var id = lib.guid();
			self.servers[id] = new Server(config);
			return self.servers[id];
		}
	};
})();

module.exports = tycho;