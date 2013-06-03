//
// router.js
//

/**
 * The router provides messaging facilities for workers
 * to communicate and cooperate amongst each other
 */

module.exports = Router;

function Router(processID) {
	this.workerCount = 0;
	this.workers = {};
	this.requests = {};
	this.processID = processID;
}

/**
 * Add a new worker to the router pool
 * @param {cluster.Worker} worker - the worker to add
 */
Router.prototype.addWorker = function (worker) {
	this.workerCount++;
	this.workers[worker.id] = worker;
	worker.on('message', this.handleMessage.bind(this));
};

/**
 * Removes a worker from the router pool
 * TODO: check outstanding requests and resolve if they are waiting on this worker
 * @param {string} workerID - ID of the worker process to remove
 */
Router.prototype.removeWorker = function (workerID) {
	if (workerID in this.workers) {
		this.workerCount--;
		delete this.workers[workerID];
	}
};

/**
 * Broadcast a message to all workers
 * If a callback is specified, then it will be executed when an ACK is received
 * from each worker
 * @param {string} type - a name for the given message (e.g. 'start', 'pause', etc.)
 * @param {Object} payload - the message payload to send to all workers
 * @param {function} [callback] - a function to execute when all workers have acknowledged
 *		receipt of the message.  the function is passed no arguments.
 */
Router.prototype.broadcast = function (type, payload, callback) {
	var requestID = lib.guid();
	if (callback && typeof callback === 'function') {
		this.requests[requestID] = {
			responses: {},
			responseCount: 0,
			callback: callback
		};
	}
	lib.each(this.workers, function (worker) {
		this.send(worker, type, payload, requestID);
	});
};

/**
 * Send a message to a specified worker
 * @param {string|cluster.Worker} worker - the worker object or worker ID to send a message to
 * @param {string} type - a name for the given message (e.g. 'start', 'pause', etc.)
 * @param {Object} payload - the message payload to send to the worker
 * @param {int|string} [transactionID] - an ID to use to associate responses with this message
 */
Router.prototype.send = function (worker, type, payload, transactionID, source) {
	var id = (typeof worker === 'object' ? worker.id : worker);
	if (id in this.workers) {
		worker.send({ 
			id: (transactionID || null),
			type: (type || 'message'),
			payload: (payload || {}),
			source: (source && source.id) || this.processID
		});
	}
};

/**
 * Broadcast a data request message to all workers
 *
 * When a worker responds with data, the callback with be executed
 */
Router.prototype.request = function (payload, callback) {
	var requestID = lib.guid();
	this.requests[requestID] = callback;
	lib.each(this.workers, function (worker) {
		this.send(worker, 'data_request', payload, requestID);
	});
};

/**
 * Respond to an internal data request (worker -> worker)
 */
Router.prototype.reply = function (destination, source, payload, transactionID) {
	if (destination in this.workers) {
		this.send(this.workers[destination], 'data_response', payload, transactionID);
	}
};


// --------------------------------------------------------

/**
 * Event handler executed whenever a worker sends a message up to the router
 *
 * There are a few special message types that are used internally by the router
 * 	'ack' - a worker is acknowledging receipt of a previous message
 *  'data_response' - a worker is responding to a prior data request with useful information
 *  'data_request' - a worker is requesting information from the other workers
 *
 * @param {cluster.Worker} worker - the worker who initiated the message
 * @param {Object} message - the message payload that was sent by the worker
 */
Router.prototype.handleMessage = function (worker, message) {
	// Define the default message type routes
	switch (message.type) {
		case 'ack':
			this.handleAck(worker, message);
			break;
		case 'data_response':
			this.handleDataResponse(worker, message);
			break;
		case 'data_request':
			this.request(message, this.reply.bind(this, worker.id));
			break;
		case 'broadcast':
			this.broadcast(message.type, message.payload);
			break;
		default:
			if (message.destination in this.workers) {
				this.send(this.workers[message.destination], message.type, messsage, null, worker);
			}
			break;
	}
};

/**
 *
 */
Router.prototype.handleAck = function (worker, message) {
	// ACK the message request
	if (message.id in this.requests) {
		var request = this.requests[message.id];
		if (!(worker.id in request.responses)) {
			// Sanity check for dup acks
			request.responses[worker.id] = 1;
			request.responseCount++;
			// Check to see if all requests have come back
			if (request.responseCount === this.workerCount) {
				request.callback();
			}
		}
	}
};

/**
 * 
 */
Router.prototype.handleDataResponse = function (worker, message) {
	// Check if the request is still outstanding
	if (message.id in this.requests) {
		this.requests[message.id](worker.id, message.payload, message.id);
		delete this.requests[message.id];
	}
};

