//
// InstanceManager.js
//

//
// The instance manager is in charge of wrapping all instances inside a single
// container, to facilitate data sharing between servers and workers
//
var util = require('util'),
	EventEmitter = require('events').EventEmitter,
	Instance = require('./instance'),
	lib = require('./lib');

function InstanceManager() {
	this.localInstances = {};
	this.remoteLinks = {};

	this.on('notify-instance-create', registerRemoteLink);
	this.on('notify-instance-remove', unregisterRemoteLink);
	this.on('notify-connection-join', registerRemoteConnection);
	this.on('notify-connection-leave', unregisterRemoteConnection);
	this.on('forward-client-message', deliverMessage);
}

/**
 * Create a new instance underneath this InstanceManager,
 * @param {string} roomName - unique reference to this instance
 */
InstanceManager.prototype.register = function (roomName) {
	if (!(roomName in this.localInstances)) {
		this.localInstances[roomName] = new Instance(roomName);
		// Attach listeners for instance events
		this.localInstances[roomName].on('add-connection', this.registerConnection.bind(this));
		this.localInstances[roomName].on('pipe', this.pipeMessage.bind(this));
		this.localInstances[roomName].on('broadcast', this.broadcastMessage.bind(this));

		this.emit('notify-instance-create', roomName);
	}
	return this.localInstances[roomName];
};

InstanceManager.prototype.registerConnection = function (connection) {
	// Notify other instances of the new connection
	this.emit('notify-connection-join', connection.id);
};

/**
 * Bind an instance from another worker to an instance in this manager
 */
InstanceManager.prototype.registerRemoteLink = function (roomName) {
	this.remoteLinks[roomName] = {};
};


/**
 *
 */
InstanceManager.prototype.registerRemoteConnection = function (workerID, roomName, connectionID) {
	// Somehow we didn't get a notification that this instance had been created
	if (!(room in this.remoteLinks)) {
		this.remoteLinks[room] = {};
	}
	this.remoteLinks[room][connectionID] = workerID;
};

/**
 *
 */
InstanceManager.prototype.unregister = function (roomName) {
	// Remove the room from the manager
	// Inform the room that it is being dropped, so that it can alert its connections
	var instance = this.instances[roomName];
	if (instance) {
		instance.fire('drop');
		delete this.instances[roomName];
		this.emit('notify-instance-remove', roomName);
	}
};

InstanceManager.prototype.unregisterConnection = function (connection) {
	this.emit('notify-connection-leave', connection.id);
};

/**
 *
 */
InstanceManager.prototype.unregisterRemoteLink = function (roomName) {
	delete this.remoteLinks[roomName];
};

/**
 *
 */
InstanceManager.prototype.unregisterRemoteConnection = function (workerID, roomName, connectionID) {
	delete this.remoteLinks[roomName][connectionID];
};

/**
 * Return the instance registered with the given room name, or null if one does not exist
 */
InstanceManager.prototype.lookup = function (roomName) {
	return this.localInstances[roomName] || null;
};

/**
 * Deliver a message from another client to the given instance
 */
InstanceManager.prototype.deliverMessage = function (instanceID, connectionID, message) {
	if (instanceID in this.localInstances) {
		var instance = this.localInstances[instanceID];
		// TODO: Handle message delivery failure
		instance.pipeMessage(connectionID, message);
	}
	else {
		// Not deliverable!
		// TODO: Handle deliver failure
	}
};


/**
 *
 */
InstanceManager.prototype.pipeMessage = function (instance, connection, message) {
	if (instance.id in this.remoteLinks) {
		var route = connection.id.split(':');
		// [0] => workerID, [1] => instanceID, [2] => connectionID
		this.emit('pipe', route[0], route[1], route[2], message);
		// var workerID = this.remoteLinks[instance.id][connectionID];
		// this.emit('pipe', workerID, instance.id, connectionID, message);
	}
	else {
		// There are no connections outside with the given id, so return a failure
		instance.fire('error', CONNECTION_NOT_FOUND, connectionID);
	}
};

/**
 *
 */
InstanceManager.prototype.broadcast = function (instance, message) {
	if (instance.id in this.remoteLinks) {
		var connections = this.remoteLinks[instance.id];
		lib.each(connections, function (workerID, connectionID) {
			this.emit('pipe', workerID, instance.id, connectionID, message);
		});
	}
	else {
		// No need to return an error, it is possible that all connections are local
	}
};

util.inherits(InstanceManager, EventEmitter);
