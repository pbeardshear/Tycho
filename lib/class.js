//
//	Simple Javascript class creation helper
//

module.exports = function (def) {
	var cls = function () {
		// Bind all the non-functions to the object
		for (var prop in def) {
			if (def.hasOwnProperty(prop) && typeof prop !== 'function') {
				this[prop] = (typeof def[prop] === 'object' ? Object.create(def[prop]) : def[prop]);
			}
		}
		def.init.apply(this, arguments);
	};
	for (var method in def) {
		if (def.hasOwnProperty(method) && typeof method === 'function') {
			cls.prototype[method] = def[method];
		}
	}
	return cls;
};
