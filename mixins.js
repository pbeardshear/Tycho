var _ = require('underscore'),
	Utils = require('./utils');
// -------------------------------------------------------------------------------
// Mixins - adds a useful mixin function to the global namespace, as well as 
//			to Object.prototype
// -------------------------------------------------------------------------------

var _mixins = { };

registerMixin = function (name, properties) {
	_mixins[name] = properties;
};

addMixins = mixin = function (target, mixins) {
	if (Array.isArray(mixins)) {
		var properties;
		_.each(mixins, function (name) {
			if (properties = (_mixins[name] || /* object */ name)) {
				for (var key in properties) {
					if (properties.hasOwnProperty(key)) {
						target[key] = properties[key];
					}
				}
			}
			else {
				throw new Error(Utils.format("Mixin: {0} is not defined.", name));
			}
		});
	}
	else {
		mixin(target, [mixins]);
		return target;
	}
};

Object.prototype.mixin = mixin;