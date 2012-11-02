/**
 * Mixin for a robust evented interface
 *
 * Example usage:
 * var event = require('event');
 * event.mixin(_class_, [event names]);
 */

/**
 * Add interface methods to prototype of class
 * Three methods are added:
 *
 *  1. on(eventName, handler, [scope, args]) : void
 *    Binds the passed handler to the given event.  If scope is passed,
 *    then the handler will be executed with 'this' being bound to the
 *    passed object.  If args (array) is passed, then the handler callback
 *    will be executed with these arguments.  See fire for more details.
 *  2. off(eventName, handler) : void
 *    Removes a handler from the given event.  The function handler passed
 *    to this method must be the same as the one passed to .on();
 *  3. fire(eventName, [args]) : boolean
 *    Fires an event, executing all callbacks associated with that event.
 *    Additionally, a arbitrary number of additional arguments can be supplied,
 *    and these arguments will be passed to each callback.  If the handler was
 *    bound with additional arguments, those will be first in the list.  Returns
 *    true if the event fired successfully.
 *      Example: 
 *          instance.on('test', callback, [2,3]);
 *          instance.fire('test', 4);
 *          Then callback will be executed with (2,3,4).
 */

exports.init = function (eventNames) {
    var events = {};
    if (eventNames) {
        for (var i = 0; i < eventNames.length; i++) {
            events[eventNames[i]] = {};
        }    
    }
    this._events = events;
};

exports.on = function(eventName, handler, scope, args) {
    if (!this._events[eventName]) {
        this._events[eventName] = [];
    }
    this._events[eventName].push({ fn: handler, scope: scope, args: args });
};

exports.off = function(eventName, handler) {
    var handlers = this._events[eventName];
    if (handlers) {
        // Remove the handler
        for (var i = 0; i < handlers.length; i++) {
            if (handlers[i].fn === handler) {
                handlers[i].splice(i, 1);
            }
        }
    }
};

exports.fire = function(eventName) {
    var args = Array.prototype.slice.call(arguments, 1),
        handlers = this._events[eventName];
    if (handlers) {
        // Call handlers sequentially
        for (var i = 0; i < handlers.length; i++) {
            var localArgs = (handlers[i].args || []).concat(args);
            handlers[i].fn.apply(handlers[i].scope || this, localArgs);
        }
        return true;
    }
    return false;
};
