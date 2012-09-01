//
//	Simple Javascript class creation helper
//

module.exports = function (def) {
	var cls = def.init ||  function () { };
	delete def.init;
	cls.prototype = def;
	return cls;
};
