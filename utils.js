var _ = require('underscore');

// -------------------------------------------------------------------------------
// Utils - adds several useful utility methods to a Utils namespace
// -------------------------------------------------------------------------------

// Set up namespace
var Utils = { };
module.exports = Utils;

// Name some constants that are used throughout
var floor = Math.floor,
	ceil = Math.ceil,
	rand = Math.random;
	

Utils.random = function (range) {
	return floor(rand() * range);
};

Utils.randomRange = function (min, max) {
	return min + (rand() * (max - min));
};

Utils.randomInt = function (min, max) {
	return min + floor(rand() * (max - min + 1));
};

Utils.format = function (base) {
	var args = Array.prototype.slice.call(arguments, 1),
		token = null;
	console.log('utils.format', args);
	while (token = base.match(/{(\d)}/)) {
		base = base.replace(token[0], args[parseInt(token[1])]);
	}
	return base;
};

// Removes the element at start index and places it at end index
Utils.move = function (array, start, end) {
	var el = array.splice(start, 1)[0];
	if (el) {
		array.splice(end, 0, el);
	}
}

Utils.moveBack = function (arr, start) {
	Utils.move(arr, start, arr.length - 1);
};

Utils.moveFront = function (arr, start) {
	Utils.move(arr, start, 0);
};


