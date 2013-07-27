//
// Store.js
//

/**
 * Communication middletier for worker processes
 * Wraps all interactions with the backend datastore
 */
var EventEmitter = require('events').EventEmitter,
	redis = require('redis'),
	lib = require('./lib'),
	log = require('./log');

function Store(processID, options, channels) {
	this.processID = processID;
	this.flags = {};
	this.subCount = 1 + ((channels && channels.length) || 0);

	// Data command client
	this.client = this.createClient(options.port, options.host, options.auth);

	// Pub/sub clients
	this.pub = this.createClient(options.port, options.host, options.auth);
	this.sub = this.createClient(options.port, options.host, options.auth);
	this.sub.on('message', this.onMessage.bind(this));
	this.sub.on('subscribe', this.onSubscribe.bind(this));

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
 *
 */
Store.prototype.close = function () {
	this.client.end();
	this.pub.end();
	this.sub.end();
};

/**
 * Data storage API
 */
Store.prototype.commands = function () {
	return this.client;
};

Store.prototype.multi = function () {
	return this.client.multi();
};

Store.prototype.set = function (hash, key, value, callback) {
	this.client.hset(hash, key, value, callback);
};

Store.prototype.get = function (hash, key, callback) {
	this.client.hget(hash, key, callback);
};

Store.prototype.mset = function (hash, obj, callback) {
	this.client.hmset(hash, obj, callback);
};

Store.prototype.mget = function (hash, callback) {
	this.client.hgetall(hash, function (err, res) {
		callback(err, res);
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
		// log.out('Sending message:', fmsg);
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
	// log.out('Received message at:', this.processID, 'from:', channel, message);
	var fmsg = JSON.parse(message);
	if (fmsg) {
		this.emit.call(this, 'message', fmsg.type, fmsg.payload, fmsg.src);
	}
};

/**
 * Handler for channel subscription events
 * When the store has finished subscribing to all channels,
 * a 'subscribe' event is emitted
 */
Store.prototype.onSubscribe = function (channel, count) {
	if (count === this.subCount) {
		this.emit('subscribe', count);
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
	log.error('Store error:', err.stack);
	try {
		this.client.end();
		this.pub.end();
		this.sub.end();
	}
	catch (ex) {
		log.error('Unable to close store client connections.');
	}
};

module.exports = Store;