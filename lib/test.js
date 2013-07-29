var tycho = require('./tycho');

tycho.init({
	run: '/Users/pbs/Documents/projects/Tycho/lib/test2.js',

	store: {
		port: 6379,
		host: 'localhost'
	},

	// connection: {
	// 	port: 6379,
	// 	host: 'localhost'
	// },

	servers: [
		{
			type: tycho.constants.connectionTypes.TCP,
			port: 8000
		},
		{
			type: tycho.constants.connectionTypes.UDP,
			port: 9000
		},
		{
			type: tycho.constants.connectionTypes.WEBSOCKET,
			port: 3000
		}
	]
});

// tycho.on('ready', function () {
// 	tycho.start();
// });

// tycho.on('connection', function (connection) {
// 	console.log('Got connection', connection);
// });

// var count = 0;
// tycho.on('online', function () {
// 	count++;
// 	if (count >= 2) {
// 		setTimeout(function () {
// 			tycho.start();
// 		}, 1000);
// 	}
// });