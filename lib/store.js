//
// Store.js
//

/**
 * Communication middletier for worker processes
 * Wraps all interactions with the backend datastore
 */
var EventEmitter = require('events').EventEmitter,
	redis = require('redis'),
	lib = require('./lib');

function Store(processID, options, channels) {
	this.processID = processID;
	this.flags = {};

	// Data command client
	this.client = this.createClient(options.port, options.host, options.auth);

	// Pub/sub clients
	this.pub = this.createClient(options.port, options.host, options.auth);
	this.sub = this.createClient(options.port, options.host, options.auth);
	this.sub.on('message', this.onMessage.bind(this));

	// Always subscribe to your own process channel
	this.sub.subscribe(this.getProcessChannel());

	if (Array.isArray(channels)) {
		for (var i = 0; i < channels.length; i++) {
			this.sub.subscribe(channels[i]);
		}
	}
}

lib.inherits(Store, EventEmitter);

/**
 * Data storage API
 */
Store.prototype.multi = function () {
	return this.client.multi();
};

Store.prototype.set = function (hash, key, value, callback) {
	this.client.hset(hash, key, value, callback);
};

Store.prototype.get = function (hash, key, callback) {
	this.client.hget(hash, key, callback);
};

Store.prototype.mset = function (hash, key, obj, callback) {
	this.client.hmset(hash, key, obj, callback);
};

Store.prototype.mget = function (hash, key, callback) {
	this.client.hgetall(hash, function (err, res) {
		callback(err, res[key]);
	});
};

Store.prototype.del = function (hash, key, callback) {
	this.client.hdel(hash, key, callback);
};


/**
 * Communication API
 */
Store.prototype.send = function (type, worker, message) {
	var fmsg = this.formatMessage(type, message);
	if (fmsg) {
		console.log('--- SENDING MESSAGE:', fmsg);
		this.pub.publish(this.getProcessChannel(worker), fmsg);
	}
};

Store.prototype.broadcast = function (type, message) {
	var fmsg = this.formatMessage(type, message);
	if (fmsg) {
		this.pub.publish('broadcast', fmsg);
	}
};

Store.prototype.onMessage = function (channel, message) {
	console.log('RECEIVED MESSAGE at:', this.processID, 'from:', channel, message);
	var fmsg = JSON.parse(message);
	if (fmsg) {
		this.emit.call(this, 'message', fmsg.type, fmsg.payload, fmsg.src);
	}
};

/**
 * @private
 * Get the channel for a given worker process
 * returns the current worker channel by default
 */
Store.prototype.getProcessChannel = function (processID) {
	return 'tycho:worker:' + (processID || this.processID);
};

/**
 * @private
 * Create a new data client connection
 */
Store.prototype.createClient = function (port, host, auth) {
	var client = redis.createClient(port, host);
	if (auth) {
		client.auth(auth.password);
	}
	client.on('error', this.onStoreError.bind(this));
	return client;
};

/**
 * @private
 * Returns a consistently formatted message for delivery
 */
Store.prototype.formatMessage = function (type, message) {
	try {
		return JSON.stringify({
			type: type,
			src: this.processID,
			payload: message
		});
	}
	catch (ex) {
		// Unable to deliver message
		return null;
	}
};

/**
 * An error was thrown in the node-redis module, or the server itself failed
 */
Store.prototype.onStoreError = function (err) {
	// Force end the connections
	console.log('\n\n--- STORE ERROR ---', err, err.stack, '\n\n');
	this.pub.end();
	this.sub.end();
};

module.exports = Store;