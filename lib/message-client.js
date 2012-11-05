//
// message.js
//

/*
 *
 * This messaging framework is the default message system for both the client and the server.
 * 
 * It currently requires tycho to run on the client.
 *
 */

var exports = (typeof exports === 'undefined' ? this.tycho.messages = {} : exports);
 
(function (exports) {
	//	Private namespace
	// ------------------------------------------------------------------------------------
	var self = {
		messages: {},
		handlers: {}
	};
	
	// Define the location that this script is running in
	self.environment = (typeof module !== 'undefined' && module.exports ? 'server' : 'client');
	
	self.send = function (name, data, callback, cb) {
		// Send a message, based on what environment we are in
		if (self.environment === 'server') {
			cb(name, data, callback);
		}
		else {
			tycho.send(name, data, callback);
		}
	};
	
	self.emit = function (name, message, cb) {
		// Scope to hold properties between methods
		var bin = {};
		if (message.init) {
			message.init.call(bin);
		}
		if (!message.validate || message.validate.call(bin)) {
			self.send(name, message.serialize.call(bin), (message.callback && message.callback.bind(bin)), cb);
		}
	};
	
	//	Public interface
	// ------------------------------------------------------------------------------------
	// Create a new message binding
	exports.define = function (name, def) {
		var bindings = name;
		if (typeof name === 'string' && def) {
			bindings = {};
			bindings[name] = def;
		}
		for (var mname in bindings) {
			if (bindings.hasOwnProperty(mname) && !self.messages[mname]) {
				self.messages[mname] = bindings[mname];
			}
		}
	};
		
	// Send a message to the server
	// You can also send messages without defining them first,
	// although this should only be used in a limited fashion
	exports.send = function (name, cb, callback) {
		var data = self.environment === 'client' ? cb : null;
		if (self.messages[name]) {
			self.emit(name, self.messages[name], cb);
		}
		else if (data) {
			self.send(name, data, callback);
		}
	};
	
	// Bind a handler to a message from the server
	exports.accept = function (name, handler) {
		if (!self.handlers[name]) {
			self.handlers[name] = [];
		}
		self.handlers[name].push(handler);
	};
	
	// @Private
	// Handle incoming message from server
	exports.receive = function (message, connection) {
		var name = message.type,
			handlers = self.handlers[name];
		if (handlers) {
			for (var i = 0; i < handlers.length; i++) {
				if (self.environment === 'server') {
					handlers[i].call(connection, message.data, message);
				}
				else {
					handlers[i].call(message, message.data);
				}
			}
		}
	};
})(exports);
