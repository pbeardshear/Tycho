var Class = require('../class'),
	Connection = require('../connection'),
	WSConnection = {};

/**
 * Constructor
 */
WSConnection.init = function (server, processID, ws) {
	this._super(processID);

	this.ws = ws;
	this.ws.on('message', this.onMessage.bind(this));
	this.ws.on('close', this.onClose.bind(this));
	this.server.on('pause', this.pause.bind(this));

	// Reasons for dropping a connection
	// These are duplicated here for use by the developer
	this.reasonCodes = {
		normal: this.ws.CLOSE_REASON_NORMAL,
		goingAway: this.ws.CLOSE_REASON_GOING_AWAY,
		protocolError: this.ws.CLOSE_REASON_PROTOCOL_ERROR,
		unprocessable: this.ws.CLOSE_REASON_UNPROCESSABLE_INPUT,
		reserved: this.ws.CLOSE_REASON_RESERVED,
		abnormal: this.ws.CLOSE_REASON_ABNORMAL,
		invalidData: this.ws.CLOSE_REASON_INVALID_DATA,
		policyViolation: this.ws.CLOSE_REASON_POLICY_VIOLATION,
		messageSize: this.ws.CLOSE_REASON_MESSAGE_TOO_BIG,
		extensionRequired: this.ws.CLOSE_REASON_EXTENSION_REQUIRED
	};
};

WSConnection.send = function (message) {
	if (!this.paused) {
		if (typeof message === 'object' && !Buffer.isBuffer(message)) {
			// JSON data
			message = JSON.stringify(message);
		}
		this.ws.send(message);	
	}
};

/**
 * Terminate the connection
 * This closes a connection without waiting for a confirmation
 * from the host.  Should only be called if an error occurs.
 */
WSConnection.drop = function (description, reasonCode) {
	this.ws.drop(reasonCode || this.reasonCodes.normal, description);
	this.close();
};

/**
 * Event handlers
 */

/**
 * Fired when a new data packet is received on this connection
 */
WSConnection.onMessage = function (message) {
	if (!this.onBeforeMessage()) {
		return;
	}

	// Accept message
	var payload;
	if (message.type === 'utf8') {
		try {
			payload = JSON.parse(message.utf8Data);
		}
		catch (ex) {
			// Unable to parse data
			this.send(messages.invalidData);
			return;
		}
	}
	else if (message.type === 'binary') {
		// Convert from binary back to object
		try {
			if (Buffer.isBuffer(message.binaryData)) {
				payload = JSON.parse(message.binaryData.toString('utf8'));
			}
			else {
				// Something has gone horribly wrong...
				this.send(messages.malformedData);
				return;
			}
		}
		catch (ex) {
			// Unable to parse data
			this.send(messages.invalidData);
			return;
		}
	}

	if (!payload) {
		// Something went wrong, the message was probably corrupted
		this.send(messages.invalidData);
		return;
	}
	// Call the appropriate handler
	this.fire(payload.type, payload.data);
};


module.exports = Connection.extend(WSConnection);
