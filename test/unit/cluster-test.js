//
// cluster-test.js
//

var tycho = require('../../lib/tycho');

// Start and stop tycho using clusters
exports.usingCluster = {
	setUp: function (callback) {
		// Initialize tycho
		tycho.init({
			cluster: true,
			clusters: 4,
			log: {
				enabled: false
			}
		});
		callback();
	},

	tearDown: function (callback) {
		tycho.on('stop', function () {
			tycho.off();
			callback();
		});
		tycho.stop();
	},

	start: function (test) {
		test.expect(1);
		tycho.on('start', function () {
			test.ok(tycho.running);
			test.done();
		});
		tycho.start(3000);
	}
};

// Start and stop tycho using only default server
exports.withoutCluster = {
	setUp: function (callback) {
		tycho.init({
			cluster: false,
			log: {
				enabled: false
			}
		});
		callback();
	},

	tearDown: function (callback) {
		tycho.on('stop', function () {
			tycho.off();
			callback();
		});
		tycho.stop();
	},

	start: function (test) {
		test.expect(1);
		tycho.on('start', function () {
			test.ok(tycho.running);
			test.done();
		});
		tycho.start(3000);
	}
};