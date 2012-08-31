// ----------------------------------------------------------------------------
// util - adds a bunch of useful utility methods that are used throughout tycho
// ----------------------------------------------------------------------------

// Set up namespace
var util = { };

// Constants
// ----------------------------------------------------------------------------
var floor = Math.floor,
	ceil = Math.ceil,
	rand = Math.random;
	

// Random
// ----------------------------------------------------------------------------
util.random = function (range) {
	return (rand() * range);
};

util.randomRange = function (min, max) {
	return min + (rand() * (max - min));
};

util.randomRangeInt = function (min, max) {
	return min + floor(rand() * (max - min + 1));
};

// Generate a random id
// Taken from: <https://gist.github.com/982883>
// Copyright (C) 2011 Jed Schmidt <http://jed.is>
util.guid = function (a){
	return a ? (a^Math.random()*16>>a/4).toString(16) : ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, util.guid);
}

// String
// ----------------------------------------------------------------------------
// Supports named replacement as well as arbitrary-length index replacement
util.format = function (template) {
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

util.capitalize = function (str) {
	return str[0].toUpperCase() + str.substring(1);
};

// Array
// ----------------------------------------------------------------------------
// Removes the element at index 'start' and places it at index 'end'
util.move = function (array, start, end) {
	var el = array.splice(start, 1)[0];
	if (el) {
		array.splice(end, 0, el);
	}
}

// Moves the element at index 'start' to the end of the array
util.moveBack = function (arr, start) {
	util.move(arr, start, arr.length - 1);
};

// Moves the element at index 'start' to the beginning of the array
util.moveFront = function (arr, start) {
	util.move(arr, start, 0);
};

// Object
// ----------------------------------------------------------------------------
// Consistent length method for any object
util.size = function (container) {
	if (Array.isArray(container)) {
		return container.length;
	}
	else {
		var count = 0;
		for (var key in container) {
			if (container.hasOwnProperty(key)) {
				count += 1;
			}
		}
		return count;
	}
};

// Consistent iteration interface for arrays and objects
util.each = function (container, fn, scope) {
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

module.exports = util;