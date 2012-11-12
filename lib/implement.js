/**
 * Add an interface to a class' prototype
 *
 */

var lib = require('./lib');

module.exports = implement;

function implement(instance, mixin) {
    var args = Array.prototype.slice.call(arguments, 2);

    lib.each(mixin, function (fn, name) {
        if (!instance[name] && name !== 'init') {
            instance[name] = fn;
        }
    });

    if (mixin.init) {
        // Initial setup the interface may need to do
        mixin.init.apply(instance, args);
    }
    
    return instance;
}