//
// Tycho internal messages, used by connections
//

var messages = {};
module.exports = messages;

/**
 * Define messages
 */
messages.invalidData = {
	type: 'error',
	data: {
		code: 400,
		name: 'invalidData',
		reason: 'Unable to parse data packet.'
	}
};

messages.malformedData = {
	type: 'error',
	data: {
		code: 400,
		name: 'malformedData',
		reason: 'Binary data buffer was malformed.'
	}
};

messages.serverError = {
	type: 'error',
	data: {
		code: 500,
		name: 'serverError',
		reason: 'Internal server error.'
	}
};

messages.connectionPaused = {
	type: 'error',
	data: {
		code: 503,
		name: 'connectionPaused',
		reason: 'Server is not accepting messages at this time.'
	}
};

messages.ack = {
	type: 'ack'
};