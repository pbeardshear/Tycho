var Class = require('../class'),
	Connection = require('../connection'),
	WSConnection = {};

/**
 * Constructor
 */
WSConnection.init = function (server, ws) {
	this._super(server);

	this.ws = ws;
	this.ws.on('message', this.onMessage);
	this.ws.on('close', this.onClose);
	this.server.on('pause', this.pause);

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
Connection.drop = function (description, reasonCode) {
	this.ws.drop(reasonCode || this.reasonCodes.normal, description);
	this.close();
};


module.exports = Connection.extend(WSConnection);
