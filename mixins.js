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
			if (properties = (_mixins[name] || (typeof name == 'object' && name))) {
				for (var key in properties) {
					if (properties.hasOwnProperty(key)) {
						target[key] = properties[key];
					}
				}
			}
			else {
				console.log(name);
				throw new Error(Utils.format("Mixin '{0}' is not defined.", name));
			}
		});
	}
	else {
		mixin(target, [mixins]);
	}
	return target;
};

Object.prototype.mixin = function (mixins) {
	return mixin(this, mixins);
};


//
//	Define mixins
//

// Gives an object a consistent interface for registering events that other objects can attach handlers to
registerMixin('eventable', {
	_events: {},
	
	isEventable: true,
	registerEvents: function (eventNames) {
		for (var i = 0; i < eventNames.length; i++) {
			this._events[eventNames[i]] = { _listeners: [], active: true, target: this };
		}
	},
	
	fireEvent: function (eventName, options, scope) {
		var event = this._events[eventName],
			listeners = event && event._listeners;
		if (listeners && event.active) {
			for (var i = 0; i < listeners.length; i++) {
				listeners[i].call(event.target, event);
			}
		}
	},
	
	disableEvent: function (event) {
		
	}
});

// Provides a single listen method that allows this object to register a callback which
// executes whenever the object fires the watched event
registerMixin('listener', {
	_hook: function (event, callback) {
		this._events[event]._listeners.append(callback);
	},
	
	listen: function (target, event, callback) {
		if (target.isEventable) {
			if (target._events[event]) {
				target._hook.call(target, event, callback);
			}
		} else {
			console.error('Only objects which include the "eventable" mixin can be listened to.');
			return;
		}
	},
	
	removeListener: function () { }
});
