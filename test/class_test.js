//
//	class_test.js
//

require('../class');

module.exports = {
	extend: function (test) {
		var cls = Class.extend({
			init: function (a, b) { this.a = a; this.b = b; },
			sum: function () { return this.a + this.b; }
		});
		var instance = new cls(1,2);
		test.equal(instance.sum(), 3);
		test.done();
	}
};

