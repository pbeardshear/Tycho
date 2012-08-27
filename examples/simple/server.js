var tycho = require('../../lib/tycho');

tycho.createServer().listen(3000);

tycho.Routes.sample = function (internal, message) {
	tycho.out.log('in routing');
	this.send('Beep boop, received sample message', 'response');
};

tycho.Routes.another = function (internal, message) {
	// Echo back received message
	console.log(message);
	this.send('Echoing received message:\n' + message.data[1], 'response');
};
