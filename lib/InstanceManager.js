//
// InstanceManager.js
//

//
// The instance manager is in charge of wrapping all instances inside a single
// container, to facilitate data sharing between servers and workers
//
var EventEmitter = require('events').EventEmitter,
	redis = require('redis'),
	Q = require('q'),
	Instance = require('./instance'),
	lib = require('./lib');

function InstanceManager(channel, config) {
	var self = this;
	// this.masterProcess = config.masterID;
	this.processID = config.processID;
	this.connection = config.connection;
	this.localInstances = {};

	this.channel = channel;
	// TODO: Update handler because only argument passed is message
	this.channel.on('manager:broadcast', this.onIncomingBroadcast.bind(this));
	this.channel.on('manager:send', this.onIncomingMessage.bind(this));
	this.channel.on('manager:instance-close', this.unregister.bind(this));
	this.channel.on('manager:new-connection', this.registerNewConnection.bind(this));

	this.instanceChannel = new EventEmitter();
	this.instanceChannel.on('instance:message', this.handleInstanceMessage.bind(this));
	
	this.client = redis.createClient(this.connection.port, this.connection.host);

	// TODO: config.emptyInstanceName
	this.register('__empty')
		.then(function () {
			self.channel.emit('manager:message', {
				type: 'ready'
			});
		})
		.fail(function (err) {
			// TODO
			console.log('ERROR:', err);
		});
}

lib.inherits(InstanceManager, EventEmitter);

/**
 * [Deferred]
 * Create a new instance underneath this InstanceManager,
 * @param {string} roomName - unique reference to this instance
 */
InstanceManager.prototype.register = function (roomName) {
	var self = this,
		deferred = Q.defer(),
		ikey = this.generateInstanceKey(roomName);
	if (!(ikey in this.localInstances)) {
		var instance = new Instance(ikey, this.instanceChannel);
		this.localInstances[ikey] = instance;

		deferred.resolve(instance);
		// this.client.exists(ikey, function (err, exists) {
		// 	console.log('--- --- exists', err, exists);
		// 	if (!exists) {
		// 		// Hash of instance key => connections
		// 		self.client.hmset('test', '', '', function (err, res) {
		// 			if (err) {
		// 				deferred.reject(err);
		// 			}
		// 			else {
		// 				deferred.resolve(instance);
		// 			}
		// 		});
		// 	}
		// 	else {
		// 		deferred.resolve(instance);
		// 	}
		// });
	}
	else {
		// Instance already exists
		deferred.resolve(this.localInstances[ikey]);
	}
	return deferred.promise;
};

/**
 * Add a new connection to the shared pool
 * @param {Instance} instance - the instance to add the connection to
 * @param {Connection} connection - the newly created connection to add
 */
InstanceManager.prototype.registerConnection = function (instance, connection) {
	this.client.hset(instance.id, connection.id, connection.getRawAddress());
};

/**
 * Add a newly accepted connection to the default instance, and
 * register it in the shared connection pool
 * @param {Connection} connection
 */
InstanceManager.prototype.registerNewConnection = function (connection) {
	var emptyInstance = this.getEmptyInstance();
	emptyInstance.addConnection(connection);
	this.registerConnection(emptyInstance, connection);
};

/**
 * Remove an instance shard managed by this worker, notifying all other
 * managers to also drop the instance
 * @param {Instance} instance - the closing instance
 * @param {String} source - worker process on which the event originated
 */
InstanceManager.prototype.unregister = function (instance, source) {
	// Remove the room from the manager
	delete this.localInstances[instanceID];
	if (!source) {
		this.channel.emit('manager:message', {
			type: 'instance-close',
			payload: {
				instance: instance
			}
		});

		this.client.del(instance.id, function (err, res) { });	
	}
};

/**
 * Remove a connection from the list of valid connection addresses
 * @param {Instance} instance - the instance managing the connection
 * @param {Connection} connection - the connection being dropped
 */
InstanceManager.prototype.unregisterConnection = function (instance, connection) {
	this.client.hdel(instance.id, connection.id);
};

/**
 * Deliver a message from another client to the given instance
 * @param {Address} destAddress - connection address to deliver the message to
 * @param {Object} message - message payload to send
 * @param {Address} sourceAddress - address of the source connection
 * @param {String} sourceWorker - processID of the worker which sent the request
 */
InstanceManager.prototype.onIncomingMessage = function (destAddress, message, sourceAddress, sourceWorker) {
	var instanceID = destAddress.instanceID,
		connectionID = destAddress.connectionID;
	if (instanceID in this.localInstances) {
		
		this.localInstances[instanceID]
			.sendMessage(connectionID, message)
			.fail(this.onDeliveryFailure.bind(this, sourceAddress, message));
	}
	else {
		this.onDeliveryFailure(sourceAddress, message, new Error('Connection not found.'));
	}
};

/**
 * Forward a broadcast request from another worker to a matching instance here
 * @param {String} instanceID - the id of the distributed instance to broadcast the message on
 * @param {Object} message - message payload to send
 */
InstanceManager.prototype.onIncomingBroadcast = function (instanceID, message) {
	if (instanceID in this.localInstances) {
		// The instance has a shard on this worker
		this.localInstances[instanceID].broadcast(null, message);
	}
};

/**
 * Notify a source worker that a message request could not be completed
 * @param {Address} address - address of the connection which originated the request
 * @param {Object} origMsg - original message which could not be delivered
 * @param {Error} error - the error that occurred
 */
InstanceManager.prototype.onDeliveryFailure = function (address, origMsg, error) {
	this.channel.emit('manager:message', {
		type: 'error',
		payload: {
			address: address,
			data: origMsg,
			error: error
		}
	});
};

/**
 * Receive a notification response from another worker that a message request
 * sent by this manager could not be completed
 * @param {Address} address - connection address to notify
 * @param {origMsg} origMsg - original message sent by the connection
 * @param {Error} error - the error that occurred during delivery
 */
InstanceManager.prototype.onNotifyError = function (address, origMsg, error) {
	if (address.instanceID in this.localInstances) {
		this.localInstances[address.instanceID]
			.notifyConnection('error', address.connectionID, error, origMsg);
	}
};

/**
 * Deliver a message from a connection registered to this manager to a connection
 * on a different worker process
 * @param {Instance} sourceInstance - instance which originated the message request
 * @param {String} to - id of the connection to deliver the message to
 * @param {Object} message - message payload to deliver
 * @param {Address} from - address of the connection originating the request
 */
InstanceManager.prototype.sendMessage = function (sourceInstance, to, message, from) {
	this.findConnection(sourceInstance, to)
		.then(function (rawAddress) {
			var address = lib.parseAddress(address);
			if (address.workerID === this.processID) {
				this.localInstances[address.instanceID]
					.sendMessage(to, message)
					.fail(this.onDeliveryFailure.bind(this, from, message));
			}
			else {
				this.channel.emit('manager:message', {
					type: 'send',
					dest: address.workerID,
					payload: {
						instance: sourceInstance,
						to: to,
						from: from,
						data: message
					}
				});
			}
		})
		.fail(function (error) {
			this.notifyError(from, message, new Error('Connection not found.'));
		});
};

InstanceManager.prototype.getEmptyInstance = function () {
	// TODO: config.emptyInstanceName
	var ikey = this.generateInstanceKey('__empty');
	return this.localInstances[ikey];
};

InstanceManager.prototype.findConnection = function (instance, connectionID) {
	var deferred = Q.defer();
	this.client.hgetall(instance.instanceID, function (connections) {
		if (connectionID in connections) {
			deferred.resolve(connections[connectionID]);
		}
		else {
			deferred.reject();
		}
	});
	return deferred.promise();
};

/**
 * Send a broadcast request out to all managers to broadcast on a given instance
 * @param {Instance} instance - the distributed instance to broadcast to
 * @param {Connection} connection - the connection which originated the broadcast
 * @param {Object} message - the message payload to deliver
 */
InstanceManager.prototype.broadcastMessage = function (instance, connection, message) {
	// Send a broadcast message
	this.channel.emit('manager:message', {
		type: 'broadcast',
		payload: {
			instance: instance,
			data: message
		}
	});
	// this.router.broadcast('client-broadcast', [instance.id, message])
};

InstanceManager.prototype.handleInstanceMessage = function (message) {
	var instance = message.payload.instance,
		connection = message.payload.connection;
	console.log('--- --- Receiving instance message...');
	switch (message.type) {
		case 'broadcast':
			this.broadcastMessage(instance, connection, message.payload.data);
			break;
		case 'send':
			this.sendMessage(
				instance,
				message.payload.to,
				message.payload.data,
				message.payload.from
			);
			break;
		case 'close':
			this.unregister(instance);
			break;
		case 'addconnection':
			this.registerConnection(instance, connection);
			break;
		case 'dropconnection':
			this.unregisterConnection(instance, connection);
			break;
		default:
			console.log('--- --- --- Bubbling message...');
			// Bubble message
			this.channel.emit('manager:message', message);
			break;
	}
};

/**
 * @Private
 * Generate a unique instance key to use in the shared data store
 * @param {String} roomName - key name to use
 */
InstanceManager.prototype.generateInstanceKey = function (roomName) {
	// TODO: hash, repo support
	return roomName;
};


module.exports = InstanceManager;