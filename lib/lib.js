// ----------------------------------------------------------------------------
// lib - adds a bunch of useful libity methods that are used throughout tycho
// ----------------------------------------------------------------------------

// Set up namespace
var lib = { };

// Constants
// ----------------------------------------------------------------------------
var floor = Math.floor,
	ceil = Math.ceil,
	rand = Math.random;


// Random
// ----------------------------------------------------------------------------
lib.random = function (range) {
	return (rand() * range);
};

lib.randomRange = function (min, max) {
	return min + (rand() * (max - min));
};

lib.randomRangeInt = function (min, max) {
	return min + floor(rand() * (max - min + 1));
};

// Generate a random guid
// Taken from: <https://gist.github.com/982883>
// Copyright (C) 2011 Jed Schmidt <http://jed.is>
lib.guid = function (a) {
	return a ? (a^Math.random()*16>>a/4).toString(16) : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, lib.guid);
};

// Faster, shorter unique ID.  Default for computing IDs in Tycho.
// Has an ~10^-6 probability of collision with 6 million IDs
lib.uid = function (a) {
	return a ? (Math.random()*16>>0).toString(16) : ([1e16]+'').replace(/[01]/g, lib.uid);
};

// Longer unique ID with very low collision probability, and slightly faster
// computation time compared to lib.guid
lib.biguid = function (a) {
	return a ? (Math.random()*16>>0).toString(16) : ([1e16]+1e16).replace(/[01]/g, lib.biguid);
};

// String
// ----------------------------------------------------------------------------
// Supports named replacement as well as arbitrary-length index replacement
lib.format = function (template) {
	var args = Array.prototype.slice.call(arguments, 1),
		values,
		token;
	if (args.length === 1 && typeof args[0] === 'object') {
		// Named arguments
		values = args[0];
	}
	else {
		// Index-based arguments
		values = {};
		args.forEach(function (val, index) { values[index] = val; });
	}
	while (token = template.match(/{(\w+)}/)) {
		template = template.replace(token[0], values[token[1]]);
	}
	return template;
};

lib.capitalize = function (str) {
	return str[0].toUpperCase() + str.substring(1);
};

// Array
// ----------------------------------------------------------------------------
// Removes the element at index 'start' and places it at index 'end'
lib.move = function (array, start, end) {
	var el = array.splice(start, 1)[0];
	if (el !== undefined) {
		array.splice(end, 0, el);
	}
	return array;
};

// Moves the element at index 'start' to the end of the array
lib.moveBack = function (arr, start) {
	lib.move(arr, start, arr.length - 1);
	return arr;
};

// Moves the element at index 'start' to the beginning of the array
lib.moveFront = function (arr, start) {
	lib.move(arr, start, 0);
	return arr;
};

// Returns the first element in the array whose field matches the given value.
lib.find = function (arr, field, value, index) {
	for (var i = 0; i < arr.length; i++) {
		if (arr[i][field] === value) {
			return index ? i : arr[i];
		}
	}
	return index ? -1 : null;
};

lib.remove = function (arr, index) {
	arr.splice(index, 1);
};

// Object
// ----------------------------------------------------------------------------
// Consistent length method for any object
lib.size = function (container) {
	if (Array.isArray(container)) {
		return container.length;
	}
	else {
		return Object.keys(container).length;
	}
};

// Consistent iteration interface for arrays and objects
lib.each = function (container, fn, scope) {
	if (Array.isArray(container)) {
		container.forEach(fn, scope);
	}
	else {
		for (var key in container) {
			if (container.hasOwnProperty(key)) {
				fn.call(scope || this, container[key], key);
			}
		}
	}
};

// Add each property in from the second object to the first object
// Replace an existing property only if force = true
lib.apply = function (target, source, force, recursive) {
	if (target && typeof target === 'object' && source && typeof source === 'object') {
		lib.each(source, function (value, key) {
			if (recursive && target[key] && typeof value === 'object' && typeof target[key] === 'object') {
				target[key] = lib.apply(target[key], value, force, recursive);
			}
			else if (force || !target[key]) {
				target[key] = value;
			}
		});
	}
	return target;
};

// Bind a scope to each function present in the methodGroup object
lib.bindAll = function (methodGroup, scope) {
	lib.each(methodGroup, function (fn, name) {
		if (typeof fn === 'function') {
			methodGroup[name] = fn.bind(scope);
		}
	});
};

// Require
// ----------------------------------------------------------------------------
// Verifies that the target object contains all required properties
// If a property is missing, an exception is thrown
lib.require = function (target, properties) {
	for (var i = 0; i < properties.length; i++) {
		if (!(properties[i].toString() in target)) {
			// Log the error, to provide more information
			log.error(target, 'missing required property', properties[i].toString());
			throw new Error('Target does not contain all required properties.');
		}
	}
};

// Verifies that the target object contains at least one of the required properties
// Properties are grouped into arrays and passed as additional arguments after the object
// Example: lib.requireOne(obj, ['foo', 'bar'], ['baz']);
//	=> true if obj has both 'foo' and 'bar' as properties, or if obj has 'baz' as a property
lib.requireOne = function (target) {
	var properties = Array.prototype.slice.call(arguments, 1);
	for (var i = 0; i < properties.length; i++) {
		try {
			lib.require.call(lib, target, properties[i]);
			return;
		}
		catch (ex) {
		}
	}
	log.error(target, 'unable to satisfy required properties', properties);
	throw new Error('Target does not contain any of the required properties.');
};

// Function
// ----------------------------------------------------------------------------
// Implementation of built-in util.inherits which acts more like a mixin by
// not clobbering the existing prototype of the child class
lib.inherits = function (child, parent) {
	for (var method in parent.prototype) {
		if (parent.prototype.hasOwnProperty(method)) {
			if (!(method in child.prototype)) {
				child.prototype[method] = parent.prototype[method];
			}
		}
	}
};

// Address
// ----------------------------------------------------------------------------
// Parses an address string into a formatted object
lib.parseAddress = function (rawAddress) {
	var blocks = rawAddress.split(':');
	return {
		worker: blocks[0],
		connection: blocks[1]
	}
};

// Build a new address from the supplied ids
lib.constructAddress = function (workerID, connectionID) {
	return [workerID, connectionID].join(':');
}

module.exports = lib;
