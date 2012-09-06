//
//	tycho collective unit testing
//
//	Most of the messaging/communication testing of tycho occurs through phantomjs
//

var tycho = require('../../lib/tycho'),
	server = require('../../lib/server'),
	instance = require('../../lib/instance'),
	connection = require('../../lib/connection'),
	lib = require('../../lib/lib');

// Utilities
// Base for a mock websocket
var socketBase = {
	on: function () { },
	set: function () { },
	get: function () { },
	join: function () { },
	leave: function () { }
};
function generateSocket() {
	return lib.apply({ id: lib.guid2() }, socketBase);
}

// Creating entities
exports.create = {
	server: function (test) {
		this.tycho = tycho.createServer({ log: false });
		test.ok(this.tycho.server);
		test.done();
	},
	
	instance: function (test) {
		// Boilerplate setup
		this.server = tycho.createServer({ log: false }).server;
		// Test
		this.instanceA = this.server.registerInstance(0);
		this.instanceB = this.server.registerInstance(1);
		test.equal(this.instanceA.server, this.server);
		test.equal(this.instanceB.server, this.server);
		test.equal(lib.size(this.server.instances), 2);
		test.done();
	},
	
	connection: function (test) {
		// Boilerplate setup
		this.server = tycho.createServer({ log: false }).server;
		this.instance = this.server.registerInstance(0);
		// Test
		this.connectionA = this.server.registerConnection(generateSocket());
		this.connectionB = this.server.registerConnection(generateSocket());
		test.equal(this.connectionA.server, this.server);
		test.equal(this.connectionB.server, this.server);
		test.equal(lib.size(this.server.connections), 2);
		test.done();
	}
};

exports.handoff = {
	setUp: function (cb) {
		this.tycho = tycho.createServer({ log: false });
		this.server = this.tycho.server;
		this.instance = this.server.registerInstance(0);
		this.connection = this.server.registerConnection(generateSocket());
		cb();
	},
	
	tearDown: function (cb) {
		cb();
	},
	
	// Handing connection from server -> instance by passing connection object
	handConnectionByObject: function (test) {
		this.server.handConnection(this.connection);
		test.equal(this.connection.instance, this.instance);
		test.equal(lib.size(this.instance.connections), 1);
		test.done();
	},
	
	// Handing connection from server -> instance by passing connection id
	handConnectionByID: function (test) {
		this.server.handConnection(this.connection.id);
		test.equal(this.connection.instance, this.instance);
		test.equal(lib.size(this.instance.connections), 1);
		test.done();
	}
};

exports.drop = {
	setUp: function (cb) {
		this.tycho = tycho.createServer({ log: false });
		this.server = this.tycho.server;
		this.instance = this.server.registerInstance(0);
		this.connection = this.server.registerConnection(generateSocket());
		this.server.handConnection(this.connection);
		cb();
	},
	
	tearDown: function (cb) {
		cb();
	},
	
	dropConnectionInstance: function (test) {
		// Sanity check
		test.equal(lib.size(this.instance.connections), 1);
		this.instance.dropConnection(this.connection);
		test.equal(lib.size(this.instance.connections), 0);
		test.equal(lib.size(this.server.connections), 1);
		// Allow the connection to reconnect
		test.ok(this.connection.instance);
		test.done();
	},
	
	dropConnectionServer: function (test) {
		// Sanity check
		test.equal(lib.size(this.instance.connections), 1);
		// Bubble drop up to server
		this.instance.dropConnection(this.connection, true);
		test.equal(lib.size(this.instance.connections), 0);
		test.equal(lib.size(this.server.connections), 0);
		// Connection dropped from server, can't reconnect
		test.ok(!this.connection.instance);
		test.done();
	},
	
	dropInstanceByObject: function (test) {
		// Sanity check
		test.equal(lib.size(this.server.instances), 1);
		this.server.dropInstance(this.instance);
		test.equal(lib.size(this.server.instances), 0);
		test.equal(lib.size(this.instance.connections), 0);
		test.ok(!this.instance.server);
		test.done();
	},
	
	dropInstanceByName: function (test) {
		// Sanity check
		test.equal(lib.size(this.server.instances), 1);
		this.server.dropInstance(this.instance.name);
		// Server is not using named instances, so nothing should happen
		test.equal(lib.size(this.server.instances), 1);
		test.ok(this.instance.server);
		test.done();
	}
};
