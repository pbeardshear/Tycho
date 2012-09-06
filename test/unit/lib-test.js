//
//	utils_unit.js
//
var lib = require('../../lib/lib');

module.exports = {
	format: function (test) {
		// Basic multiple argument formatting
		test.equal(lib.format('this is a {0} test string, {1}', 'cool', 'yes'), 'this is a cool test string, yes');
		// Named argument formatting
		test.equal(lib.format('this is an {adj} test string, {exclamation}', { adj: 'awesome', exclamation: 'brother!' }), 'this is an awesome test string, brother!');
		test.done();
	},
	
	move: function (test) {
		var base = [1,2,3,4,5];
		// Move from one index to another
		test.equal(lib.move(base, 3, 0)[0], 4);
		// Move to front
		base = [1,2,3,4,5];
		test.equal(lib.moveFront(base, 1)[0], 2);
		// Move to back
		base = [1,2,3,4,5];
		test.equal(lib.moveBack(base, 1)[4], 2);
		test.done();
	},
	
	find: function (test) {
		var values = [{ id: 2 }, { id: 4 }, { id: 9 }, { id: 14 }];
		// Search for existing value
		test.equal(lib.find(values, 'id', 9).id, 9);
		// Search for non-existing value
		test.equal(lib.find(values, 'id', 10), null);
		// Search for non-existing key
		test.equal(lib.find(values, 'otherkey', 9), null);
		test.done();
	},
	
	remove: function (test) {
		var values = [1,2,3,4];
		lib.remove(values, 1);
		test.equal(values[1], 3);
		// Removing outside array doesn't blow up
		lib.remove(values, 5);
		test.equal(values[2], 4);
		test.equal(values.length, 3);
		test.done();
	},
	
	size: function (test) {
		var o = {
			prop1: 'nothin',
			prop2: null,
			prop3: []
		};
		test.equal(lib.size(o), 3);
		// Base case
		test.equal(lib.size({}), 0);
		// Array
		test.equal(lib.size([43,'a',{},6]), 4);
		test.done();
	},
	
	each: function (test) {
		test.expect(4);
		var container = {
				a: 2,
				b: 4
			},
			runCounter = 0;
		lib.each(container, function (val, key) {
			test.ok(val === 2 || val === 4);
			test.ok(key === 'a' || key === 'b');
			if (runCounter === 1) {
				test.done();
			}
			runCounter += 1;
		});
	},
	
	apply: function (test) {
		var invader = { unique: 'key', duplicate: 'value' },
			target = { other: 'key', duplicate: 'other-value' };
		lib.apply(target, invader);
		// Got invader properties
		test.equal(target.unique, 'key');
		// No overwriting
		test.equal(target.duplicate, 'other-value');
		lib.apply(target, { duplicate: 'supervalue' }, true);
		// Forced property overwrite
		test.equal(target.duplicate, 'supervalue');
		test.done();
	}
};
