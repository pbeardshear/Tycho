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
	Router = require('router'),
	Instance = require('./instance'),
	lib = require('./lib');

function InstanceManager(config) {
	this.processID = config.processID;
	this.connection = config.connection;
	this.localInstances = {};

	this.client = redis.createClient(this.connection.port, this.connection.host);
	this.router = new Router(this.processID, this.connection);

	this.router.on('notify-instance-remove', this.unregister.bind(this));
	// this.router.on('notify-connection-leave', this.unregisterRemoteConnection.bind(this));
	// Messaging
	this.router.on('client-message', this.onIncomingMessage.bind(this));
	this.router.on('client-error', this.onNotifyError.bind(this));
	this.router.on('client-broadcast', this.onIncomingBroadcast.bind(this));
}

lib.inherits(InstanceManager, EventEmitter);

/**
 * [Deferred]
 * Create a new instance underneath this InstanceManager,
 * @param {string} roomName - unique reference to this instance
 */
InstanceManager.prototype.register = function (roomName) {
	var deferred = Q.defer(),
		ikey = this.generateInstanceKey(roomName);
	if (!(ikey in this.localInstances)) {
		this.localInstances[ikey] = new Instance(ikey);
		// Attach listeners for instance events
		this.localInstances[ikey].on('addconnection', this.registerConnection.bind(this));
		this.localInstances[ikey].on('dropconnection', this.unregisterConnection.bind(this));
		this.localInstances[ikey].on('pipe', this.pipeMessage.bind(this));
		this.localInstances[ikey].on('broadcast', this.broadcastMessage.bind(this));
		this.localInstances[ikey].on('close', this.unregister.bind(this));

		this.client.exists(key, function (err, exists) {
			if (!exists) {
				// Hash of instance key => connections
				this.client.hmset(key, { }, function (err, res) {
					if (err) {
						deferred.reject(err);
					}
					else {
						deferred.resolve(this.localInstances[ikey]);
					}
				});
			}
			else {
				deferred.resolve(this.localInstances[ikey]);
			}
		});
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
 * Remove an instance shard managed by this worker, notifying all other
 * managers to also drop the instance
 * @param {Instance} instance - the closing instance
 * @param {String} source - worker process on which the event originated
 */
InstanceManager.prototype.unregister = function (instance, source) {
	// Remove the room from the manager
	delete this.localInstances[instanceID];
	if (!source) {
		this.router.broadcast('notify-instance-remove', instanceID);

		this.client.del(instance.id, function (err, res) { });	
	}
};

/**
 * Remove a connection from the list of valid connection addresses
 * @param {Instance} instance - the instance managing the connection
 * @param {Connection} connection - the connection being dropped
 */
InstanceManager.prototype.unregisterConnection = function (instance, connection) {
	// this.emit('notify-connection-leave', connection.id);
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
			.pipeMessage(connectionID, message)
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
	this.router.send('client-error', address.workerID, [address, origMsg, error]);
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
 * @param {String} connectionID - id of the connection to deliver the message to
 * @param {Object} message - message payload to deliver
 * @param {Address} sourceAddress - address of the connection originating the request
 */
InstanceManager.prototype.pipeMessage = function (sourceInstance, connectionID, message, sourceAddress) {
	if (this.processID === destAddress.workerID) {
		this.client.hgetall(sourceInstance.instanceID, function (connections) {
			if (connectionID in connections) {
				var destAddress = connections[connectionID];
				if (destAddress.instanceID in this.localInstances) {
					this.localInstances[destAddress.instanceID]
						.pipeMessage(destAddress.connectionID, message)
						.fail(this.onDeliveryFailure.bind(this, sourceAddress, message));
				}
				else {
					sourceInstance
						.pipeMessage(sourceAddress, new Error('Connection not found.'))
						.fail(this.onDeliveryFailure.bind(this, sourceAddress, message));
				}
			}
			else {
				this.onNotifyError(sourceAddress, message, new Error('Connection not found.'));
			}
		});
	}
	else {
		this.router.send('client-message', address.workerID, [address, message, sourceAddress]);
	}
};

/**
 * Send a broadcast request out to all managers to broadcast on a given instance
 * @param {Instance} instance - the distributed instance to broadcast to
 * @param {Connection} connection - the connection which originated the broadcast
 * @param {Object} message - the message payload to deliver
 */
InstanceManager.prototype.broadcastMessage = function (instance, connection, message) {
	// Send a broadcast message
	this.router.send('client-broadcast', [instance.id, message])
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

