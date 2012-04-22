//
//	integration_test.js
//

var Server = require('../server'),
	Instance = require('../instance'),
	Connection = require('../connection');

exports.server = {
	setUp: function (callback) {
		this.server = new Server();
		callback();
	},
	tearDown: function (callback) {
		callback();
	},
	unnamedInstances: function (test) {
		test.expect(1);
		// Instances are unnamed
		this.server._namedInstances = false;
		this.server.registerInstance();
		this.server.registerInstance();
		
		// Get the second instance
		var instance = this.server._instanceLRU[0];
		this.server.handConnection(new Connection({ id: 1 }));
		// Check if this instance has moved to the back
		test.equal(this.server._instanceLRU[1], instance);
		test.done();
	},
	namedInstances: function (test) {
		test.expect(2);
		// Instances are named
		this.server._namedInstances = true;
		this.server.registerInstance('game1');
		this.server.registerInstance('game2');
		
		var instance = this.server._instances['game1'];
		// Instances are retrievable by name
		test.ok(instance);
		
		this.server.handConnection(new Connection({ id: 1 }), 'game1');
		// Handing a connection doesn't somehow rearrange or remove this instance
		test.equal(instance, this.server._instances['game1']);
		test.done();
	}
};

exports.instance = {
	setUp: function (callback) {
		this.server = new Server();
		// Register some instances
		this.server.registerInstance();
		this.server.registerInstance();
		
		this.instance = this.server._instanceLRU[0];
		callback();
	},
	tearDown: function (callback) {
		callback();
	},
	broadcast: function (test) {
		// Create some mock connections
		var connectionA = new Connection({ id: 1 }),
			connectionB = new Connection({ id: 2 }),
			connectionC = new Connection({ id: 3 });
			
		this.instance.handConnection(connectionA);
		this.instance.handConnection(connectionB);
		this.instance.handConnection(connectionC);
		
		var ACallCount = 0,
			BCallCount = 0,
			CCallCount = 0,
			totalCount = 0;
		// Stub the connection send methods
		connectionA.send = function () { ACallCount++; totalCount++; };
		connectionB.send = function () { BCallCount++; totalCount++; };
		connectionC.send = function () { CCallCount++; totalCount++; };
		
		this.instance.broadcast();
		test.equal(ACallCount, 1) && test.equal(BCallCount, 1) && test.equal(CCallCount, 1) && test.equal(totalCount, 3);
		test.done();
	}
};

// TODO
exports.connection = {
	setUp: function (callback) {
		callback();
	},
	tearDown: function (callback) {
		callback();
	}
};
