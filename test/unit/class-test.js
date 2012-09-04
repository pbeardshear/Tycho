//
//	class_test.js
//

var Class = require('../../lib/class');

module.exports = {
	create: function (test) {
		var cls = Class({
			prop: {},
			init: function (a) { this.value = a; },
			method: function () { return this.prop; }
		});
		var inst = new cls(2),
			inst2 = new cls(3);
		// Values are set correctly by constructor
		test.equal(inst.value, 2);
		inst.prop.key = 4;
		inst2.prop.key = 5;
		// Properties are not duplicated between instances
		test.notEqual(inst.prop.key, inst2.prop.key);
		// Methods work correctly
		test.deepEqual(inst.prop, inst.method());
		test.done();
	}
};

