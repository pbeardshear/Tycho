//
//	Simple Javascript class creation helper
//
require('./mixins');

module.exports = Class = {
	extend: function (prop) {
		var _constructor = prop.init || function () { }
		delete prop.init;
		_constructor.prototype = prop;
		if (prop.mixins) {
			_constructor.prototype.mixin(prop.mixins);
		}
		return _constructor;
	},
	implement: function () { }
};

