//
//	Simple Javascript class creation helper
//
var mixin = require('./mixins');

module.exports = Class = {
	extend: function (prop) {
		var _constructor = prop.init || function () { }
		delete prop.init;
		_constructor.prototype = prop;
		return _constructor;
	}
};

// TODO: Should just be this:
// module.exports = function (def) {
	// var cls = def.init ||  function () { };
	// delete def.init;
	// cls.prototype = def;
	// return cls;
// };
