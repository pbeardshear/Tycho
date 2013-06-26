//
// router.js
//

/**
 * Communication middletier for worker processes
 * Wraps redis channel pub/sub pattern
 */
var EventEmitter = require('events').EventEmitter,
	redis = require('redis'),
	lib = require('./lib');

function Router(processID, routerOptions) {
	this.processID = processID;
	this.port = routerOptions.port;
	this.host = routerOptions.host;
	this.options = routerOptions.options;
	this.auth = routerOptions.auth;

	// Bind client events
	// this.client.on('error', this.onStoreError.bind(this));
	// this.client.on('end', );
	// TODO: Rate limiting
	// this.client.on('drain');
	// this.client.on('idle');

	// Subscribe to default channels
	this.pub = this.createClient(this.port, this.host, this.options, this.auth);
	this.sub = this.createClient(this.port, this.host, this.options, this.auth);
	this.sub.on('message', this.onMessage.bind(this));
	this.sub.subscribe('broadcast');
	this.sub.subscribe(this.getProcessChannel());
}

lib.inherits(Router, EventEmitter);

/**
 * Communication API
 */
Router.prototype.send = function (type, worker, message) {
	var fmsg = this.formatMessage(type, message);
	if (fmsg) {
		console.log('--- SENDING MESSAGE:', fmsg);
		this.pub.publish(this.getProcessChannel(worker), fmsg);	
	}
};

Router.prototype.broadcast = function (type, message) {
	var fmsg = this.formatMessage(type, message);
	if (fmsg) {
		this.pub.publish('broadcast', fmsg);
	}
};

Router.prototype.onMessage = function (channel, message) {
	console.log('RECEIVED MESSAGE at:', this.processID, 'from:', channel, message);
	var fmsg = JSON.parse(message);
	if (fmsg) {
		var args = ['message'].concat([fmsg.type, fmsg.payload, fmsg.src]);
		this.emit.apply(this, args);
	}
};

// @Private
// Get the channel for a given worker process
// returns the current worker channel by default
Router.prototype.getProcessChannel = function (processID) {
	return 'tycho:worker:' + (processID || this.processID);
};

Router.prototype.createClient = function (port, host, options, auth) {
	var client = redis.createClient(port, host, options);
	if (auth) {
		client.auth(auth.password);
	}
	client.on('error', this.onStoreError.bind(this));
	return client;
};

// @Private
// Returns a consistently formatted message for delivery
Router.prototype.formatMessage = function (type, message) {
	try {
		return JSON.stringify({
			type: type,
			src: this.processID,
			payload: Array.isArray(message) ? message : [message]
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
Router.prototype.onStoreError = function (err) {
	// Force end the connections
	console.log('\n\n--- STORE ERROR ---', err, err.stack, '\n\n');
	this.pub.end();
	this.sub.end();
};

module.exports = Router;