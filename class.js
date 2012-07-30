//
//	Simple Javascript class creation helper
//
var mixin = require('./mixins');

module.exports = Class = {
	extend: function (prop) {
		var _constructor = prop.init || function () { }
		delete prop.init;
		_constructor.prototype = prop;
		if (prop.mixins) {
			Class.mixin(_constructor.prototype, prop.mixins);
		}
		return _constructor;
	},
	
	implement: function () { },
	
	mixin: mixin
};

