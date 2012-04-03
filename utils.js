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
	var args = Array.prototype.slice(arguments, 1),
		token = null;
	while (token = base.match(/{(\d)}/)) {
		base.replace(token[0], args[parseInt(token[1])]);
	}
	return base;
}