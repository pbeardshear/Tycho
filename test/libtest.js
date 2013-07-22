var assert = require('assert');

// Test file
var lib = require('../lib/lib');

describe('lib', function () {
	describe('#format()', function () {
		it('should support named replacement', function () {
			var string = 'hello my name is bob',
				template = '{greeting} my name is {name}';
			assert.equal(lib.format(template, {
				greeting: 'hello',
				name: 'bob'
			}), string);
		});

		it('should support index-based replacement', function () {
			var string = 'this is the full string',
				template = 'this {0} full {1}';
			assert.equal(lib.format(template, 'is the', 'string'), string);
		});
	});

	describe('#capitalize()', function () {
		it('should capitalize a word', function () {
			var uppercase = 'Capital',
				lowercase = 'capital';
			assert.equal(lib.capitalize(lowercase), uppercase);
		});
	});

	describe('#move()', function () {
		it('should move an element from "start" to "end"', function () {
			var array = [4,10,8,12];
			lib.move(array, 1, 3);
			assert.equal(array[3], 10);
		});
	});

	describe('#moveBack()', function () {
		it('should move an element from "start" to the end of the array', function () {
			var array = [4,2,3,1];
			lib.moveBack(array, 0);
			assert.equal(array[array.length - 1], 4);
		});
	});

	describe('#moveFront()', function () {
		it('should move an element from "start" to the beginning of the array', function () {
			var array = [6,5,3,1];
			lib.moveFront(array, 2);
			assert.equal(array[0], 3);
		});
	});

	describe('#find()', function () {
		it('should return the correct value when the element exists', function () {
			var array = [{ key: 2 }, { key: 6 }, { key: 12 }];
			assert(lib.find(array, 'key', 6));
		});

		it('should return the correct index when the element exists', function () {
			var array = [{ key: 2 }, { key: 6 }, { key: 12 }];
			assert.equal(lib.find(array, 'key', 12, true), 2);
		});

		it('should return null when the element does not exist', function () {
			var array = [{ key: 5 }, { key: 10 }, { }, { key: 2 }];
			assert.equal(lib.find(array, 'key', 11), null);
		});

		it('should return -1 when the element does not exist', function () {
			var array = [{ key: 1}, { }, { key: 'a' }];
			assert.equal(lib.find(array, 'key', 'b', true), -1);
		});
	});

	describe('#remove()', function () {
		it('should correctly remove the element at "index"', function () {
			var array = [4, 2, 5, 8];
			lib.remove(array, 1);
			assert.notEqual(array[1], 2);
		});
	});

	describe('#size()', function () {
		it('should return the number of keys when the container is an object', function () {
			var container = { a: 4, b: 'c', c: [], d: {} };
			assert.equal(lib.size(container), 4);
		});

		it('should return the length when the container is an array', function () {
			var container = [5,3,2,5,6];
			assert.equal(lib.size(container), container.length);
		});
	});

	describe('#each()', function () {
		it('should loop over each key when the container is an object', function () {
			var container = { a: 5, b: 6, c: 1, d: 3 },
				count = {};
			lib.each(container, function (el) {
				count[el] = 1;
			});
			assert.equal(Object.keys(count).length, 4);
		});

		it('should loop over each element when the container is an array', function () {
			var container = [5,6,3,1],
				count = {};
			lib.each(container, function (el) {
				count[el] = 1;
			});
			assert.equal(Object.keys(count).length, 4);
		});
	});

	describe('#apply()', function () {
		it('should perform a flat copy of missing properties', function () {
			var target = { a: 4, b: { key: 1 }, c: 0 },
				source = { a: 5, d: { key: 5 } };
			lib.apply(target, source);
			assert.equal(target.a, 4);
			assert(target.d);
			assert.equal(target.c, 0);
		});

		it('should perform a flat copy of all properties', function () {
			var target = { a: 3, b: { key1: 1 }, c: 0 },
				source = { a: 4, b: { key2: 5 } };
			lib.apply(target, source, true);
			assert.equal(target.a, 4);
			assert.equal(target.b.key2, 5);
			assert.notEqual(target.b.key1, 1);
			assert.equal(target.c, 0);
		});

		it('should perform a deep copy of missing properties', function () {
			var target = { a: 3, b: { key1: 1 } },
				source = { a: 4, b: { key1: 2, key2: 3 } };
			lib.apply(target, source, false, true);
			assert.equal(target.a, 3);
			assert.equal(target.b.key1, 1);
			assert.equal(target.b.key2, 3);
		});

		it('should perform a deep copy of all properties', function () {
			var target = { a: 3, b: { key1: 1, key3: 5 } },
				source = { a: 4, b: { key1: 2, key2: 3 } };
			lib.apply(target, source, true, true);
			assert.equal(target.a, 4);
			assert.equal(target.b.key1, 2);
			assert.equal(target.b.key2, 3);
			assert.equal(target.b.key3, 5);
		});
	});

	describe('#inherits()', function () {
		it('should add non-existing methods', function () {
			var cls = function () { };
			cls.prototype.test = function () { return 2; };
			var mixin = function () { };
			mixin.prototype.test2 = function () { return 3; };
			lib.inherits(cls, mixin);
			var obj = new cls();
			assert.equal(obj.test(), 2);
			assert.equal(obj.test2(), 3);
		});

		it('should not clobber existing methods', function () {
			var cls = function () { };
			cls.prototype.test = function () { return 2; };
			var mixin = function () { };
			mixin.prototype.test = function () { return 3; };
			lib.inherits(cls, mixin);
			var obj = new cls();
			assert.equal(obj.test(), 2);
		});
	});
});

