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

	this.client = redis.createClient(this.port, this.host, this.options);
	if (this.routerOptions.auth) {
		this.client.auth(options.auth.password, options.auth.onAuthorize);
	}

	// Bind client events
	this.client.on('error', this.onStoreError.bind(this));
	this.client.on('end', );
	// TODO: Rate limiting
	// this.client.on('drain');
	// this.client.on('idle');

	// Subscribe to default channels
	this.createChannelClient('broadcastClient', 'broadcast');
	this.createChannelClient('processClient', this.getProcessChannel());
}

lib.inherits(Router, EventEmitter);

/**
 * Communication API
 */
Router.prototype.send = function (worker, type, message) {
	var fmsg = this.formatMessage(message);
	if (fmsg) {
		this.client.publish(this.getProcessChannel(worker), fmsg);	
	}
};

Router.prototype.broadcast = function (type, message) {
	var fmsg = this.formatMessage(message);
	if (fmsg) {
		this.client.publish('broadcast', fmsg;	
	}
};

Router.prototype.onMessage = function (channel, message) {
	var fmsg = JSON.parse(message);
	if (fmsg) {
		var args = [fmsg.type].concat(payload).concat(fmsg.src);
		this.emit.apply(this, args);
	}
};

// @Private
// Get the channel for a given worker process
// returns the current worker channel by default
Router.prototype.getProcessChannel = function (processID) {
	return 'tycho:worker:' + (processID || this.processID);
};

// @Private
Router.prototype.createChannelClient = function (name, channel) {
	var client = redis.createClient(this.port, this.host, this.options);
	client.on('subscribe');
	client.on('message', this.onMessage.bind(this));
	client.subscribe(channel);

	this[name] = client;
};

// @Private
// Returns a consistently formatted message for delivery
Router.prototype.formatMessage = function (message) {
	try {
		return JSON.stringify({
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
Router.prototype.onStoreError = function () {
	// Force end the connections
	this.client.end();
	this.processClient.end();
	this.broadcastClient.end();
};
