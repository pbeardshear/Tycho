var assert = require('assert'),
	EventEmitter = require('events').EventEmitter;

// Test file
var TCPServer = require('../../lib/servers/TCPServer');

// TCP client connections
var cannon = require('../clients/tcpcannon.js');

describe('TCPServer', function () {
 	var server,
		channel = new EventEmitter(),
		manager = new EventEmitter(),
		config = { port: 8080 },
		acceptingConnections = false,
		connections = [];

	function handleManagerMessage(type) {
		// Message types we care about for testing
		var args = Array.prototype.slice.call(arguments, 1);
		switch (type) {
			case 'request':
				var callback = args[1];
				callback(acceptingConnections);
				break;
			case 'connect':
				var connection = args[0];
				connections.push(connection);
				break;
			default:
				break;
		}
	}

	before(function (done) {
		server = new TCPServer(channel, manager, config);
		cannon.aim(config.port, config.host);
		manager.on('server:message', handleManagerMessage);
		done();
	});

	describe('#start()', function () {
		it('starts correctly', function () {
			assert.doesNotThrow(function () {
				server.start(config.port, config.host)
			});
		});
	});

	describe('#handlingRequests', function () {
		it('accepts new connections', function (done) {
			var ammo = 15;
			acceptingConnections = true;
			cannon.load(ammo, function (err) {
				if (err) throw err;
				var interval = setInterval(function () {
					if (connections.length === ammo) {
						clearInterval(interval);
						done();
					}
				}, 10);
			});
		});

		it('receives and emits data', function (done) {
			var receivedMessages = 0;
			cannon.fire();
			connections.forEach(function (conn) {
				conn.on('message', function () {
					receivedMessages++;
					if (receivedMessages > 15) {
						cannon.stop();
						done();
					}
				})
			});
		});

		it('blocks unverified requests', function (done) {
			acceptingConnections = false;
			cannon.stop();
			cannon.empty();
			cannon.load(15, function () {
				connections[0].on('message', function () {
					// Received a message
					throw new Error('Received a message.');
				});
				cannon.fire();
				setTimeout(function () {
					cannon.stop();
					done();
				}, 200);
			});
		});
	});

	describe('#close()', function () {
		it('closes down smoothly', function () {
			assert.doesNotThrow(function () {
				server.close(true)
			});
		});
	});
});