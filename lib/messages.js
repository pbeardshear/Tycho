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
		name: 'invalidData',
		reason: 'Unable to parse data packet.'
	}
};

messages.malformedData = {
	type: 'error',
	data: {
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

messages.ack = {
	type: 'ack'
};