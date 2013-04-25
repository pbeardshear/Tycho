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
			events[eventNames[i]] = [];
		}    
	}
	this._events = events;
	this._buffer = {};
};

exports.on = function(eventName, handler, scope, args) {
	if (eventName in this._buffer) {
		// Event has already fired, so immediately execute the handler
		handler.apply(scope || this, args.concat(this._buffer[eventName]));
		delete this._buffer[eventName];
	}
	else {
		if (!this._events[eventName]) {
			this._events[eventName] = [];
		}
		this._events[eventName].push({ fn: handler, scope: scope, args: args });	
	}
};

exports.off = function(eventName, handler) {
	var handlers = this._events[eventName];
	if (handlers) {
		// Remove the handler
		for (var i = 0; i < handlers.length; i++) {
			if (handlers[i].fn === handler) {
				handlers.splice(i, 1);
			}
		}
	}
	else if (eventName) {
		// Remove all handlers with the given event name
		delete this._events[eventName];
	}
	else {
		// Remove all event handlers
		this._events = {};
	}
};

exports.fire = function(eventName) {
	var args = Array.prototype.slice.call(arguments, 1),
		handlers = this._events[eventName];
	if (handlers && handlers.length > 0) {
		// Call handlers sequentially
		for (var i = 0; i < handlers.length; i++) {
			var localArgs = (handlers[i].args || []).concat(args);
			setTimeout(function () {
				handlers[i].fn.apply(handlers[i].scope || this, localArgs);
			}, 10);
		}
		return true;
	}
	return false;
};

/**
 * Similar to fire, except the event will once ever fire once
 * In addition, if you bind to an event that has already fired,
 * the callback will be executed immediately
 */
exports.fireOnce = function (eventName) {
	var args = Array.prototype.slice.call(arguments, 1);
	// Attempt to fire the event
	// If handlers are executed, then unbind the event
	var result = this.fire.apply(this, arguments);
	if (result) {
		this._events[eventName] = null;
	}
	else {
		this._buffer[eventName] = args;
	}
};
