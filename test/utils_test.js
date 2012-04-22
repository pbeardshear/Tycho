//
//	utils_unit.js
//
var Utils = require('../utils');

module.exports = {
	format: function (test) {
		test.equals(Utils.format('this is a {0} test string, {1}', 'cool', 'yes'), 'this is a cool test string, yes');
		test.done();
	}
};
