//
//	tycho collective unit testing
//
//	Most of the messaging/communication testing of tycho occurs through phantomjs
//

var tycho = require('../../lib/tycho'),
	server = require('../../lib/server'),
	instance = require('../../lib/instance'),
	connection = require('../../lib/connection');

module.exports = {
	setUp: function (cb) {
		this.tycho = tycho.createServer();
		this.server = this.tycho.server;
		// Mock of an actual websocket
		this.socket = {
			id: -1,
			on: function () { }
		};
		cb();
	},
	tearDown: function (cb) {
		cb();
	},
	
	createInstance: function (test) {
		this.server.registerInstance(0);
		// Default (10) instances allowed
		test.notEqual(this.server.registerInstance(1), null);
		test.done();
	},
	
	createConnection: function (test) {
		test.done();
	}
	
};