var tycho = require('../../lib/tycho'),
	server = tycho.createServer({
		routes: {
			sample: function (message) {
				this.send('response', 'Beep boop, received sample message');
			},
			another: function (message) {
				this.send('response', 'Echoing received message:\n' + message.data[1]);
			}
		}
	});

server.listen(3000);
